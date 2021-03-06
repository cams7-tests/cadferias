import { Component, Renderer2 } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { Observable } from 'rxjs';
import { filter, tap, flatMap } from 'rxjs/operators';

import { EventsService } from './../../shared/events.service';
import { ConfirmModalService } from './../../shared/confirm-modal/confirm-modal.service';
import { Direction } from 'src/app/shared/model/vo/pagination/sort-vo';
import { BaseList } from './../../shared/common/base-list';
import { UsersService } from './../../users/users.service';
import { EmployeesService } from '../employees.service';
import { VacationsService } from './../../vacations/vacations.service';
import { Employee, EMPLOYEE_ENDPOINT_GET_WITH_AUDIT_BY_ID_REL, EMPLOYEE_ENDPOINT_GET_BY_ID_REL, EMPLOYEE_ENDPOINT_DELETE_REL } from './../../shared/model/employee';
import { EmployeeFilterVO } from './../../shared/model/vo/filter/employee-filter-vo';
import { FilterType } from 'src/app/shared/model/vo/filter/auditable-filter-vo';
import { StaffFilterVO } from 'src/app/shared/model/vo/filter/staff-filter-vo';
import { LinkWithRel, getRelByLinks } from 'src/app/shared/model/base-entity';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent extends BaseList<Employee, EmployeeFilterVO> {
          
  constructor(
    protected renderer: Renderer2,
    protected route: ActivatedRoute,
    protected router: Router,
    protected fb: FormBuilder,    
    protected eventsService: EventsService,
    protected confirmModalService: ConfirmModalService,
    private usersService: UsersService,
    private employeesService: EmployeesService,
    private vacationsService: VacationsService
  ) { 
    super(renderer, route, router, fb, eventsService, confirmModalService, employeesService);
  }

  protected addFilter(employee: EmployeeFilterVO) {
    this.eventsService.addEmployeeFilter(employee);
  }  

  protected getFilterType() {
    return FilterType.EMPLOYEE;
  }

  protected getFilterBySearch(search: string): EmployeeFilterVO {
    const employee = <EmployeeFilterVO>{};
    employee.employeeRegistration = search;
    employee.name = search;
    //employee.phoneNumber = search;
    //employee.address = <AddressFilterVO>{};
    //employee.address.street = search;
    //employee.address.neighborhood = search;
    //employee.address.city = search;
    //employee.user = <UserFilterVO>{};
    //employee.user.email = search;
    employee.staff = <StaffFilterVO>{};
    employee.staff.name = search;
    return employee;
  }

  protected getSearchByFilter(employee: EmployeeFilterVO): string {
    return employee.name;
  }

  protected setSortFields(sortFields: Map<string, Direction>) {    
    sortFields.set('name', undefined);
    sortFields.set('birthDate', undefined);
    sortFields.set('hiringDate', undefined);
    sortFields.set('employeeRegistration', undefined);
    sortFields.set('staff.name', undefined);
  }

  protected delete$(employee: Employee): Observable<void> {
    return this.confirmModalService.showConfirm$('Confirma????o', `Tem certeza que deseja remover o(a) funcion??rio(a) "${employee.name}"?`).pipe(
      filter(confirmed => confirmed),
      flatMap(_ => this.employeesService.remove$(employee.entityId)),
      tap(_ => this.eventsService.addSuccessAlert('Funcion??rio(a) exclu??do(a)!', `O(A) funcion??rio(a) "${employee.name}" foi excluido(a) com sucesso.`))
    );
  }

  getWithAuditByIdRel(links: LinkWithRel[]) {
    return getRelByLinks(links, EMPLOYEE_ENDPOINT_GET_WITH_AUDIT_BY_ID_REL);
  }

  getByIdRel(links: LinkWithRel[]) {
    return getRelByLinks(links, EMPLOYEE_ENDPOINT_GET_BY_ID_REL);
  }

  deleteRel(links: LinkWithRel[]) {
    return getRelByLinks(links, EMPLOYEE_ENDPOINT_DELETE_REL);
  }
}
