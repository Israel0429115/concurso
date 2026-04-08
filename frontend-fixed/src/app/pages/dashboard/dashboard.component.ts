import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { DengueApiService } from '../../core/services/dengue-api.service';
import { DengueWeeklyRecord, PredictionResponse, SummaryCard } from '../../core/models/dengue.models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(DengueApiService);
  private readonly fb = inject(FormBuilder);

  readonly provinces = signal<string[]>([]);
  readonly prediction = signal<PredictionResponse | null>(null);
  readonly history = signal<DengueWeeklyRecord[]>([]);
  readonly loading = signal(false);
  readonly loadingProvinces = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    province: ['GUAYAS', Validators.required],
    week: [15, [Validators.required, Validators.min(1), Validators.max(52)]],
  });

  readonly riskBadgeClass = computed(() => {
    switch (this.prediction()?.riskLevel) {
      case 'alto':
        return 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-200';
      case 'medio':
        return 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-200';
      default:
        return 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-200';
    }
  });

  readonly riskColorBar = computed(() => {
    switch (this.prediction()?.riskLevel) {
      case 'alto':
        return 'from-red-500 to-red-600';
      case 'medio':
        return 'from-amber-500 to-amber-600';
      default:
        return 'from-emerald-500 to-emerald-600';
    }
  });

  readonly summaryCards = computed<SummaryCard[]>(() => {
    const result = this.prediction();
    const rows = this.history();
    if (!result || !result.record) return [];

    const maxCases = rows.length ? Math.max(...rows.map((row) => row.cases)) : result.record.cases;
    const avgCases = rows.length
      ? (rows.reduce((sum, row) => sum + row.cases, 0) / rows.length).toFixed(1)
      : result.record.cases;

    return [
      { label: 'Nivel de Riesgo', value: result.riskLevel.toUpperCase(), hint: `Puntaje: ${Math.round(result.riskScore * 100)}/100` },
      { label: 'Casos Estimados', value: result.expectedCases.toString(), hint: 'Próxima semana' },
      { label: 'Pico Histórico', value: maxCases.toString(), hint: 'Máximo registrado' },
      { label: 'Promedio Semanal', value: avgCases.toString(), hint: 'Serie provincial' },
    ];
  });

  readonly chartBars = computed(() => {
    const rows = this.history();
    const max = rows.length ? Math.max(...rows.map((row) => row.cases)) : 1;
    return rows.map((row) => ({
      week: row.epi_week,
      cases: row.cases,
      height: `${Math.max(8, (row.cases / max) * 100)}%`,
      active: row.epi_week === this.prediction()?.epiWeek,
    }));
  });

  ngOnInit(): void {
    this.loadProvinces();
  }

  loadProvinces(): void {
    this.loadingProvinces.set(true);
    this.api
      .getProvinces()
      .pipe(finalize(() => this.loadingProvinces.set(false)))
      .subscribe({
        next: ({ provinces }) => {
          this.provinces.set(provinces);
          const current = this.form.controls.province.value;
          if (provinces.length && !provinces.includes(current)) {
            this.form.patchValue({ province: provinces[0] });
          }
          this.submit();
        },
        error: () => this.error.set('No se pudieron cargar las provincias.'),
      });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { province, week } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set(null);

    this.api
      .getPrediction(province, Number(week))
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => {
          this.prediction.set(response);
          this.loadHistory(province);
        },
        error: () => this.error.set('No se pudo obtener la predicción. Revisa el backend.'),
      });
  }

  loadHistory(province: string): void {
    this.api.getHistory(province).subscribe({
      next: ({ records }) => this.history.set(records),
      error: () => this.history.set([]),
    });
  }
}
