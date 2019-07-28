import { Component, OnInit, OnDestroy } from '@angular/core';

import { AuthService } from './shared/auth/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  constructor(
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.authService.loadTokenData();
  }

  ngOnDestroy() {
    this.authService.signOut();
  }

}
