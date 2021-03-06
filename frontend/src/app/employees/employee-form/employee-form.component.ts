import { Component, ViewChild, ElementRef, AfterViewInit, Renderer2 } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, merge, of, Subject, forkJoin } from 'rxjs';
import { distinctUntilChanged, takeUntil, switchMap, filter, map, shareReplay, debounceTime, flatMap, tap } from 'rxjs/operators';

import { EventsService } from './../../shared/events.service';
import { ErrorsService } from 'src/app/shared/errors.service';
import { ConfirmModalService } from './../../shared/confirm-modal/confirm-modal.service';
import { getRel } from 'src/app/shared/model/base-entity';
import { CityVO } from '../../shared/model/vo/address/city-vo';
import { StateVO } from '../../shared/model/vo/address/state-vo';
import { BaseForm } from './../../shared/common/base-form';
import { StaffsService } from './../../staffs/staffs.service';
import { EmployeesService } from '../employees.service';
import { Employee, EMPLOYEE_ENDPOINT_GET_WITH_AUDIT_BY_ID_REL, EMPLOYEE_ENDPOINT_GET_BY_SEARCH_REL, EMPLOYEE_ENDPOINT_UPDATE_REL, getPhoto, EMPLOYEE_PHOTO } from './../../shared/model/employee';
import { Staff } from './../../shared/model/staff';
import { EmployeePhoto, ImageType } from './../../shared/model/employee-photo';
import { HistoryService } from 'src/app/shared/history.service';

@Component({
  selector: 'app-employee-form',
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss']
})
export class EmployeeFormComponent extends BaseForm<Employee> implements AfterViewInit {
  
  stateName$ = new Subject<string>();
  private _states$: Observable<StateVO[]>;

  cityName$ = new Subject<string>();
  private _cities$: Observable<CityVO[]>;

  staffName$ = new Subject<string>();
  private _staffs$: Observable<Staff[]>; 
  
  readonly acceptedImageTypes = '.png,.jpg,.jpeg';
  private photoChanged = false;

  @ViewChild('imagePreview', { read: ElementRef, static:true }) imagePreview: ElementRef;
     
  constructor(
    private renderer: Renderer2,
    private fb: FormBuilder,
    protected route: ActivatedRoute,
    protected router: Router,
    protected historyService: HistoryService,
    private eventsService: EventsService,
    protected errorsService: ErrorsService,
    protected confirmModalService: ConfirmModalService,
    private staffsService: StaffsService,
    private employeesService: EmployeesService    
  ) { 
    super(route, router, historyService, errorsService, confirmModalService);
  }

  ngOnInit() {
    super.ngOnInit();
    
    this.form = this.fb.group({
      hiringDate: [this.getDate(<any>this.entity.hiringDate)], 
      photo: [getPhoto(this.entity)],
      employeeRegistration: [this.entity.employeeRegistration],
      name: [this.entity.name],
      birthDate: [this.getDate(<any>this.entity.birthDate)],
      phoneNumber: [this.entity.phoneNumber],
      address: this.fb.group({
        street: [this.entity.address.street],
        houseNumber: [this.entity.address.houseNumber],
        neighborhood: [this.entity.address.neighborhood],
        city: [this.entity.address.city],
        state: [this.entity.address.state]
      }),
      user: this.fb.group({
        email: [this.entity.user.email]
      }),
      staff: this.fb.group({
        entityId: [this.entity.staff.entityId]
      })
    });

    const states$ = this.employeesService.allStates$.pipe(
      shareReplay()
    );

    this._states$ = merge(
      of(this.entity.address.state).pipe(
        filter(acronym => !!acronym),
        flatMap(acronym => states$.pipe<StateVO>(
          map(states => states.find(state => state.acronym == acronym))
        )),
        filter(state => !!state),
        map(state => [state])
      ),
      this.stateName$.pipe(
        filter(name => !!name && name.trim().length > 0),
        debounceTime(this.debounceTime),
        map(name => name.trim().toLowerCase()),
        distinctUntilChanged(),
        switchMap(name => states$.pipe<StateVO[]>(
          map(states => states.filter(state => !!state && new RegExp(name, 'i').test(state.name.trim().toLowerCase())))
        )),
        takeUntil(this.end$)
      )
    );

    const cities$ = this.employeesService.allCities$.pipe(
      shareReplay()
    );

    this._cities$ = merge(
      of(this.entity.address.city).pipe(
        filter(name => !!name && !!this.form.get('address.state').value),
        flatMap(name => forkJoin(
          of(name), 
          states$.pipe<StateVO>(
            map(states => states.find(state => state.acronym == this.form.get('address.state').value))
          ), 
          cities$
        )),
        map(([name, state, cities]) => cities.find(city => city.stateId == state.id && city.name == name)),
        filter(city => !!city),
        map(city => [city])
      ),
      this.cityName$.pipe(
        filter(name => !!name && name.trim().length > 0 && !!this.form.get('address.state').value),
        debounceTime(this.debounceTime),
        map(name => name.trim().toLowerCase()),
        distinctUntilChanged(),
        flatMap(name => forkJoin(
          of(name), 
          states$.pipe<StateVO>(
            map(states => states.find(state => state.acronym == this.form.get('address.state').value))
          ), 
          cities$
        )),
        map(([name, state, cities]) => cities.filter(city => 
          !!city && city.stateId == state.id && new RegExp(name, 'i').test(city.name.trim().toLowerCase())          
        )),
        takeUntil(this.end$)
      )
    );
    
    this._staffs$ = merge(
      of(this.entity.staff).pipe(
        filter(staff => !!staff && !!staff.entityId),
        map(staff => [staff])
      ),
      this.staffName$.pipe(
          filter(name => !!name && name.trim().length > 0),          
          debounceTime(this.debounceTime),
          map(name => name.trim()),
          distinctUntilChanged(),
          switchMap(name => this.staffsService.getByName$(name)),
          takeUntil(this.end$)
        )
    );
  } 

  ngAfterViewInit() {
    const photo = getPhoto(this.entity);
    this.renderer.setStyle(this.imagePreview.nativeElement, 'background-image', `url(${!!photo ? photo : EMPLOYEE_PHOTO})`);
  }

  submit$() {
    const employee = <Employee>this.form.value;
    employee.entityId = this.entity.entityId;
    employee.birthDate = <any>this.getFormattedDate(employee.birthDate);
    employee.hiringDate = <any>this.getFormattedDate(employee.hiringDate);
    employee.phoneNumber = this.getFormattedDatePhoneNumber(employee.phoneNumber);
    employee.user.entityId = this.userId;
    employee.staff = this.staff;
    
    const photo: string = (<any>employee).photo;
    if(this.photoChanged && photo && photo.match(/^data\:image\/(png|jpg|jpeg)\;base64\,([A-Za-z0-9\/\+\=]+)$/g)) {
      const photos = this.entity.photos;
      const employeePhoto = photos && photos.length > 0 ? photos[0] : <EmployeePhoto>{};
      employeePhoto.imageType = <ImageType>photo.match(/(png|jpg|jpeg)/g)[0].toUpperCase();
      employeePhoto.photo = photo.match(/([A-Za-z0-9\/\+\=]+)$/g)[0];

      employee.photos = [employeePhoto];   
    } else 
      employee.photos = undefined;

    (<any>employee).photo = undefined;
    
    return this.employeesService.save$(employee).pipe(      
      tap(employee => {
        if(this.isRegistred)
            this.eventsService.addSuccessAlert('Funcion??rio(a) atualizado(a)!', `Os dados do(a) funcion??rio(a) "${employee.name}" foram atualizados com sucesso.`);
        else {
            this.form.patchValue({employeeRegistration: employee.employeeRegistration});
            this.eventsService.addSuccessAlert('Funcion??rio(a) cadastrado(a)!', `O(A) funcion??rio(a) "${employee.name}" foi cadastrado(a) com sucesso.`);  
        }
        this.photoChanged = false;
      })
    ); 
  }

  changePhoto(event: Event) {
    const files: FileList = (<any>event.target).files;
	  if (files && files.length == 1) {
      const file = files.item(0);
      const reader = new FileReader();
      reader.onload = progressEvent => {
        const image = (<any>progressEvent.target).result;
        this.renderer.removeStyle(this.imagePreview.nativeElement, 'background-image');
        this.renderer.setStyle(this.imagePreview.nativeElement, 'background-image', `url(${image})`);
        this.form.patchValue({photo: image});
        this.form.get('photo').markAsTouched();
        this.form.get('photo').markAsDirty();
        this.photoChanged = true;
      };
      reader.readAsDataURL(file);
	  }
  }

  get userId() {
    return this.entity.user.entityId;
  }

  get staff() {
    const employee = <Employee>this.form.value;
    if(!employee.staff || !employee.staff.entityId)
      return undefined;
    
    return employee.staff;
  }

  trackByAcronym(state: StateVO) {
    return state.acronym;
  }

  get states$() {
    return this._states$;
  }

  get cities$() {
    return this._cities$;
  }

  get staffs$() {
    return this._staffs$;
  }

  get getBySearchRel() {
    return getRel(this.entity._links, EMPLOYEE_ENDPOINT_GET_BY_SEARCH_REL);
  }

  get getWithAuditByIdRel() {
    return getRel(this.entity._links, EMPLOYEE_ENDPOINT_GET_WITH_AUDIT_BY_ID_REL);
  }

  get updateRel() {
    return getRel(this.entity._links, EMPLOYEE_ENDPOINT_UPDATE_REL);
  }

  get submitTooltip() {
    if(!this.entity._links)
      return "Salvar os dados do funcion??rio";
    return this.updateRel.title;
  }

}