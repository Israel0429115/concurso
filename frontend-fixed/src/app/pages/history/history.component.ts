import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { DengueWeeklyRecord } from '../../core/models/dengue.models';
import { DengueApiService } from '../../core/services/dengue-api.service';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './history.component.html',
})
export class HistoryComponent implements OnInit {
  private readonly api = inject(DengueApiService);

  readonly provinceControl = new FormControl('GUAYAS', { nonNullable: true });
  readonly provinces = signal<string[]>([]);
  readonly rows = signal<DengueWeeklyRecord[]>([]);
  readonly loading = signal(false);

  readonly maxCases = computed(() => {
    const rows = this.rows();
    return rows.length ? Math.max(...rows.map((row) => row.cases)) : 0;
  });

  readonly avgCases = computed(() => {
    const rows = this.rows();
    return rows.length ? (rows.reduce((sum, row) => sum + row.cases, 0) / rows.length).toFixed(1) : 0;
  });

  readonly riskBadgeClass = (level: string) => {
    switch (level) {
      case 'alto':
        return 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-md shadow-red-200';
      case 'medio':
        return 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-200';
      default:
        return 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-200';
    }
  };

  ngOnInit(): void {
    this.api.getProvinces().subscribe(({ provinces }) => {
      this.provinces.set(provinces);
      const current = this.provinceControl.value;
      if (!provinces.includes(current) && provinces.length) {
        this.provinceControl.setValue(provinces[0], { emitEvent: false });
      }
      this.load(this.provinceControl.value);
    });

    this.provinceControl.valueChanges.pipe(debounceTime(150), distinctUntilChanged()).subscribe((province) => {
      this.load(province);
    });
  }

  load(province: string): void {
    this.loading.set(true);
    this.api.getHistory(province).subscribe({
      next: ({ records }) => {
        this.rows.set(records);
        this.loading.set(false);
      },
      error: () => {
        this.rows.set([]);
        this.loading.set(false);
      },
    });
  }
}
