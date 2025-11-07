import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private ShellAPI = window.parent['ShellAPI'];
  private AccessHelper = window.parent['AccessHelper'];

  constructor(private http: HttpClient) {}

  getPatientData(patientId: string): Promise<any> {
    return firstValueFrom(
      this.http.get(
          'https://localhost:5001/api/GrowthChart/GetPatientData?ID=0',
          {
            headers: new HttpHeaders({
              'content-type': 'application/json',
            //  Authorization: 'Bearer K8oB2Vck-Na6_D-8LWLNKFwFMesdwRtH_f8ohZ0-nDs',
             Authorization: 'Bearer ' + this.AccessHelper.GetToken(false, false),
            }),
          }
      )
      // this.http.get(
      //   this.ShellAPI.getRESTCoreEndpoint() +
      //     'api/GrowthChart/GetPatientData?ID=0',
      //   {
      //     headers: new HttpHeaders({
      //       'content-type': 'application/json',
      //       Authorization: 'Bearer ' + this.AccessHelper.GetToken(false, false),
      //     }),
      //   }
      // )
    );
  }

  getChartData(chartType: string): Promise<any> {
    return firstValueFrom(

      this.http.get(
        'https://localhost:5001/api/GrowthChart/GetGrowthChartData?chartType=' +
          chartType,
        {
          headers: new HttpHeaders({
            'content-type': 'application/json',
          //  Authorization: 'Bearer K8oB2Vck-Na6_D-8LWLNKFwFMesdwRtH_f8ohZ0-nDs',
           Authorization: 'Bearer ' + this.AccessHelper.GetToken(false, false),
          }),
        }
        
      )
      // this.http.get(
      //   this.ShellAPI.getRESTCoreEndpoint() + 'api/GrowthChart/GetGrowthChartData?chartType='+ chartType,
      //   {
      //     headers: new HttpHeaders({
      //       'content-type': 'application/json',
      //       Authorization: 'Bearer ' + this.AccessHelper.GetToken(false, false),
      //     }),
      //   }
      // )
    )
  }
}
