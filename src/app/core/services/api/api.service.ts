import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor(private http: HttpClient) { }
  get<T>(urlPath: string, token?: string, params?: any) {
    const headers = new HttpHeaders({
      'X-Figma-Token': token || ''
    });
  
    return this.http.get<T>(urlPath, {
      headers,
      params
    });
  }

  post<T>(urlPath: string, payload: any, params?: any) {
    const headers = new HttpHeaders(params);
  
    return this.http.post<T>(urlPath,payload, {
      headers,
      params
    });
  }
  
}
