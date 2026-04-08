import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  HistoryResponse,
  PredictionResponse,
  ProvincesResponse,
} from '../models/dengue.models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DengueApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getProvinces(): Observable<ProvincesResponse> {
    return this.http.get<ProvincesResponse>(`${this.baseUrl}/provinces`);
  }

  getPrediction(province: string, week: number): Observable<PredictionResponse> {
    const params = new HttpParams().set('province', province).set('week', week);
    return this.http.get<PredictionResponse>(`${this.baseUrl}/prediction`, { params });
  }

  getHistory(province: string): Observable<HistoryResponse> {
    const params = new HttpParams().set('province', province);
    return this.http.get<HistoryResponse>(`${this.baseUrl}/history`, { params });
  }
}
