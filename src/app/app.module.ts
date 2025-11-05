import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { D3ChartComponent } from './d3-chart/d3-chart.component';

;
import { createCustomElement } from '@angular/elements';
import { Injector } from '@angular/core';
import { ContextMenuModule} from '@progress/kendo-angular-menu';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
  declarations: [
    AppComponent,
    D3ChartComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: []
})
export class AppModule {
  constructor(private injector: Injector) {}

  ngDoBootstrap() {    
    const MyCustomElement = createCustomElement(D3ChartComponent, { injector: this.injector });
    customElements.define('d3-chart', MyCustomElement);
  }
}