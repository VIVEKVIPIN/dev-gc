import {
  Component,
  OnInit,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  AfterViewInit,
} from '@angular/core';

import * as d3 from 'd3';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataService } from './services/data.service';
//import { StatisticsService } from './services/statistics.service';

@Component({
  selector: 'app-d3-chart',
  standalone: false,
  templateUrl: './d3-chart.component.html',
  styleUrl: './d3-chart.component.css',
})
export class D3ChartComponent implements OnInit, AfterViewInit, OnChanges {
  private svg: any;
  private margin = 50;
  private width = 750 - this.margin * 2;
  private height = 400 - this.margin * 2;

  private TRANSITION_DURATION = 750;

  g: any;
  x: any;
  y: any;
  tooltip: any;

  public state = {
    gender: 'F',
    ageRange: '2to20',
    chart: 'bmi_for_age',
    patientData: {},
    specialCondition: 'none', // 'none', 'down_syndrome'
    displayMode: 'percentile', // 'percentile' or 'zscore'
    units: {
      height: 'metric', // 'metric' (cm) or 'standard' (in)
      weight: 'metric', // 'metric' (kg) or 'standard' (lbs)
    },
    showExtremeCurves: false,
  };

  // Global data cache to store all CSV data
  dataCache = {};
  isDataLoaded = false;

  MARGIN = { top: 30, right: 30, bottom: 30, left: 30 };
   PERCENTILES = [
        { p: 3, z: -1.8808, label: '3rd' },
        { p: 10, z: -1.2816, label: '10th' },
        { p: 25, z: -0.6745, label: '25th' },
        { p: 50, z: 0, label: '50th' },
        { p: 75, z: 0.6745, label: '75th' },
        { p: 85, z: 1.0364, label: '85th' },
        { p: 90, z: 1.2816, label: '90th' },
        { p: 95, z: 1.6449, label: '95th' },
        { p: 97, z: 1.8808, label: '97th' },
        // High-end curves are gated by toggle; baseline set stops at 97th
      ]
  // [
  //   { p: 3, z: -1.8808, label: '3rd' },
  //   { p: 10, z: -1.2816, label: '10th' },
  //   { p: 25, z: -0.6745, label: '25th' },
  //   { p: 50, z: 0, label: '50th' },
  //   { p: 75, z: 0.6745, label: '75th' },
  //   { p: 90, z: 1.2816, label: '90th' },
  //   { p: 97, z: 1.8808, label: '97th' },
  // ];

  // --- UNIT CONVERSION ---
  private CM_TO_IN = 0.393701;
  private KG_TO_LB = 2.20462;

  @ViewChild('myDiv')
  myDiv!: ElementRef;
  constructor(
    public elementRef: ElementRef,
    private http: HttpClient,
    private dataService: DataService
  ) {}

  private ShellAPI = window.parent['ShellAPI'];
  private AccessHelper = window.parent['AccessHelper'];

  @Input() chartType: string = '24';

  @Input() Patient: {} = {};

  private chartData: {} = {};

  ngOnInit(): void {}

  convertHeight(value, toUnit) {
    if (toUnit === 'standard') return value * this.CM_TO_IN;
    return value; // metric is default
  }

  convertWeight(value, toUnit) {
    if (toUnit === 'standard') return value * this.KG_TO_LB;
    return value; // metric is default
  }

  getUnitLabel(unitType) {
    if (unitType === 'height') {
      return this.state.units.height === 'metric' ? 'cm' : 'in';
    }
    if (unitType === 'weight') {
      return this.state.units.weight === 'metric' ? 'kg' : 'lbs';
    }
    return '';
  }

  ngAfterViewInit() {
    // Access the native DOM element
    const nativeElement = this.myDiv.nativeElement;
    console.log('Child element by ID:', nativeElement);
    // You can now manipulate nativeElement as needed
    this.initialize();

    console.log('chartType', this.chartType);
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('Changes detected:', changes);

    if (changes['chartType']) {
      if (changes['chartType'].currentValue == 24)
        this.state.chart = 'bmi_for_age';
      else if (changes['chartType'].currentValue == 22)
        this.state.chart = 'stature_for_age';
      else if (changes['chartType'].currentValue == 20)
        this.state.chart = 'weight_for_age';
      // Reload data and redraw chart
      this.initialize();
    }
  }

  async initialize() {
    console.log('Initializing application...');
    //document.getElementById('measurement-date').valueAsDate = new Date();
    this.isDataLoaded = false;
    // Show loading message
    const container = this.myDiv.nativeElement;
    container.innerHTML =
      '<div style="display: flex; justify-content: center; align-items: center; height: 100%; font-size: 18px; color: #666;">Loading chart data...</div>';

    try {
      await this.loadPatientData();
      await this.LoadChartData();
      this.drawChart();
      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Initialization failed:', error);
      container.innerHTML =
        '<div style="display: flex; justify-content: center; align-items: center; height: 100%; font-size: 18px; color: red;">Failed to load application data. Check console for details.</div>';
    }
  }

  async LoadChartData() {
    const data = await this.dataService.getChartData(this.chartType);
    // const data = await firstValueFrom(
    //   this.http.get(
    //     // 'https://localhost:5001/api/GrowthChart/GetGrowthChartData?chartType=' +
    //     //   this.chartType,
    //     // {
    //     //   headers: new HttpHeaders({
    //     //     'content-type': 'application/json',
    //     //     Authorization: 'Bearer tbU8wfM0RGlVSzDegmVgUVzg0E1ReMygJUpfOiS9YPg',
    //     //   }),
    //     // }
    //     this.ShellAPI.getRESTCoreEndpoint() + 'api/GrowthChart/GetGrowthChartData?chartType='+ this.chartType,
    //     {
    //       headers: new HttpHeaders({
    //         'content-type': 'application/json',
    //         Authorization: 'Bearer ' + this.AccessHelper.GetToken(false, false),
    //       }),
    //     }
    //   )
    // );

    this.chartData = data;
    //this.dataCache[this.chartType] = this.chartData
    (this.chartData as any).csv = d3.csvParse((data as any).csv);
    this.isDataLoaded = true;
  }

  async loadPatientData() {
    try {
      const data = await this.dataService.getPatientData('0');
      // const data = await firstValueFrom(
      //   this.http.get(
      //     // 'https://localhost:5001/api/GrowthChart/GetPatientData?ID=0',
      //     // {
      //     //   headers: new HttpHeaders({
      //     //     'content-type': 'application/json',
      //     //     Authorization:
      //     //       'Bearer tbU8wfM0RGlVSzDegmVgUVzg0E1ReMygJUpfOiS9YPg',
      //     //   }),
      //     // }
      //     this.ShellAPI.getRESTCoreEndpoint() +
      //       'api/GrowthChart/GetPatientData?ID=0',
      //     {
      //       headers: new HttpHeaders({
      //         'content-type': 'application/json',
      //         Authorization:
      //           'Bearer ' + this.AccessHelper.GetToken(false, false),
      //       }),
      //     }
      //   )
      // );

      this.state.patientData = data;
      // Calculate BMI for 2-20 year data, or weight-for-length ratios for infant data
      if (this.getAgeRange() === '2to20') {
        (this.state.patientData as any).bmi = this.calculateBmiData(
          (this.state.patientData as any).stature,
          (this.state.patientData as any).weight
        );
      } else {
        // For 0-36 months, we don't typically calculate BMI, but we can add it as empty array
        (this.state.patientData as any).bmi = [];
      }

      return true;
    } catch (error) {
      console.error(`Failed to load patient data `, error);
      // Initialize with empty data if file fails
      if (this.getAgeRange() === '2to20') {
        this.state.patientData = { stature: [], weight: [], bmi: [] };
      } else {
        this.state.patientData = {
          length: [],
          weight: [],
          headCirc: [],
          bmi: [],
        };
      }
      return false;
    }
  }

  getCurrentChartDetails() {
    //return this.CHART_DETAILS[this.state.ageRange][this.state.chart];
    return this.chartData;
  }

  getAgeRange() {
    return this.state.ageRange;
  }

  getCachedLMSData() {
    // const chartDetails = this.getCurrentChartDetails();
    // const fileName = chartDetails.file;

    // if (!this.isDataLoaded || !this.dataCache[fileName]) {
    //   console.warn(`Data not available for ${fileName}`);
    //   return [];
    // }

    return this.parseLMSData(this.chartData['csv']);
  }

  parseLMSData(data) {
    // const chartDetails = this.getCurrentChartDetails();
    let xVar = 'Label';

    // if (chartDetails.xLabel.includes('Age')) {
    //   xVar = 'Agemos';
    // } else if (chartDetails.xLabel.includes('Length')) {
    //   xVar = 'Length';
    // } else {
    //   // For stature charts, check what column actually exists in the data
    //   // Some CSV files use 'Stature', others use 'Height'
    //   const firstRow = data[0] || {};
    //   if (firstRow.hasOwnProperty('Stature')) {
    //     xVar = 'Stature';
    //   } else if (firstRow.hasOwnProperty('Height')) {
    //     xVar = 'Height';
    //   } else {
    //     xVar = 'Stature'; // fallback
    //   }
    // }

    return (
      data
        //  .filter((d) => d.Sex === (this.state.gender === 'M' ? '1' : '2'))
        .map((d) => ({
          x: +d[xVar],
          L: +d.L,
          M: +d.M,
          S: +d.S,
        }))
    );
  }

  calculateLMSValue(L, M, S, z) {
    // if (L === 0) return M * Math.exp(S * z);
    // return M * Math.pow(1 + L * S * z, 1 / L);
    if (Math.abs(L) < 1e-6) {
      const val = M * Math.exp(S * z);
      return isFinite(val) ? val : M;
    }
    const base = 1 + L * S * z;
    if (base <= 0) {
      // Rare for our percentile set; fall back to median to preserve alignment
      return M;
    }
    const val = M * Math.pow(base, 1 / L);
    return isFinite(val) && val > 0 ? val : M;
  }

  generatePercentileSeries(lmsData) {
    const chartDetails: any = this.getCurrentChartDetails();
    const unit = chartDetails.yUnit;
    const { xDomain } = chartDetails;

    // For age-based charts, extend the data to cover the full domain with interpolation
    if (chartDetails.xLabel.includes('Age')) {
      // First, use the original LMS data points
      let baseData = lmsData.map((d) => ({
        x: chartDetails.xLabel.includes('months') ? d.x : d.x / 12,
        L: d.L,
        M: d.M,
        S: d.S,
      }));

      // If we need to extend beyond the data range, interpolate the last values
      const maxDataX = Math.max(...baseData.map((d) => d.x));
      if (xDomain[1] > maxDataX) {
        const lastPoint = baseData[baseData.length - 1];
        // Simply extend with the last known LMS values (conservative approach)
        baseData.push({
          x: xDomain[1],
          L: lastPoint.L,
          M: lastPoint.M,
          S: lastPoint.S,
        });
      }

      // Decide percentile set (extended vs standard)
      const isExtended = this.state.chart === 'bmi_for_age_extended';
      const standardDefs = this.PERCENTILES;
      const extendedDefs = [
        { p: 3, z: -1.8808, label: '3rd' },
        { p: 10, z: -1.2816, label: '10th' },
        { p: 25, z: -0.6745, label: '25th' },
        { p: 50, z: 0, label: '50th' },
        { p: 75, z: 0.6745, label: '75th' },
        { p: 85, z: 1.0364, label: '85th' },
        { p: 90, z: 1.2816, label: '90th' },
        { p: 95, z: 1.6449, label: '95th' },
        { p: 97, z: 1.8808, label: '97th' },
        // High-end curves are gated by toggle; baseline set stops at 97th
      ];

      let defs = isExtended ? extendedDefs.slice() : standardDefs.slice();
      if (isExtended && this.state.showExtremeCurves) {
        defs = defs.concat([
          { p: 99, z: 2.3263, label: '99th' },
          { p: 99.9, z: 3.0902, label: '99.9th' },
          { p: 99.99, z: 3.719, label: '99.99th' },
        ]);
      }

      const series = defs.map((p) => ({
        ...p,
        values: baseData.map((d) => {
          let yValue = this.calculateLMSValue(d.L, d.M, d.S, p.z);
          if (unit === 'height')
            yValue = this.convertHeight(yValue, this.state.units.height);
          if (unit === 'weight')
            yValue = this.convertWeight(yValue, this.state.units.weight);
          return { x: d.x, y: yValue };
        }),
      }));

      if (isExtended) {
        // Add 120% of 95th percentile curve
        const z95 = 1.6448536269;
        const p120Series = baseData.map((d) => {
          let p95 = this.calculateLMSValue(d.L, d.M, d.S, z95);
          if (unit === 'height')
            p95 = this.convertHeight(p95, this.state.units.height);
          if (unit === 'weight')
            p95 = this.convertWeight(p95, this.state.units.weight);
          return { x: d.x, y: p95 * 1.2 };
        });
        console.log('p120Series:', p120Series);
        // visit later series.push({ p: '120P95', z: null, label: '120% P95', values: p120Series });
        series.push({ p: 120, z: 0, label: '120% P95', values: p120Series });
      }

      return series;
    } else {
      // For non-age charts (length/stature based), use original data
      return this.PERCENTILES.map((p) => ({
        ...p,
        values: lmsData.map((d) => {
          let yValue = this.calculateLMSValue(d.L, d.M, d.S, p.z);

          if (unit === 'height')
            yValue = this.convertHeight(yValue, this.state.units.height);
          if (unit === 'weight')
            yValue = this.convertWeight(yValue, this.state.units.weight);

          return {
            x: d.x,
            y: yValue,
          };
        }),
      }));
    }
  }

  getPatientDataForChart() {
    const chartDetails: any = this.getCurrentChartDetails();
    const unit = chartDetails.yUnit;
    const patientData =
      this.state.patientData[chartDetails.patientDataKey] || [];
    return patientData.map((d) => {
      let value = d.value;
      if (unit === 'height')
        value = this.convertHeight(value, this.state.units.height);
      if (unit === 'weight')
        value = this.convertWeight(value, this.state.units.weight);
      return { ...d, value };
    });
  }

  calculateBmiData(statureData, weightData) {
    if (!statureData || !weightData) return [];
    const combined = {};
    statureData.forEach((d) => {
      if (!combined[d.ageMonths])
        combined[d.ageMonths] = { ageMonths: d.ageMonths, date: d.date };
      combined[d.ageMonths].stature = d.value;
    });
    weightData.forEach((d) => {
      if (!combined[d.ageMonths])
        combined[d.ageMonths] = { ageMonths: d.ageMonths, date: d.date };
      combined[d.ageMonths].weight = d.value;
    });

    return Object.values(combined)
      .filter((d: any) => d.stature && d.weight)
      .map((d: any) => {
        const heightInMeters = d.stature / 100;
        const bmi = d.weight / (heightInMeters * heightInMeters);
        return {
          ageMonths: d.ageMonths,
          value: bmi,
          date: d.date,
          details: `Stature: ${d.stature} cm, Weight: ${d.weight} kg`,
        };
      });
  }

  setupChart() {
    const container = this.myDiv.nativeElement;

    this.width = container.clientWidth - this.MARGIN.left - this.MARGIN.right;
    this.height = container.clientHeight - this.MARGIN.top - this.MARGIN.bottom;

    if (this.width < 50 || this.height < 50) return false;

    if (!this.svg) {
      container.innerHTML = '';

      this.tooltip = d3
        .select('body')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0);

      this.svg = d3.select(container).append('svg');
      this.g = this.svg
        .append('g')
        .attr(
          'transform',
          `translate(${this.MARGIN.left + 50}, ${this.MARGIN.top })`
        );

      this.g.append('g').attr('class', 'grid y');
      this.g.append('g').attr('class', 'grid x');
      this.g.append('g').attr('class', 'axis axis--y');
      this.g.append('g').attr('class', 'axis axis--x');

      this.svg.append('text').attr('class', 'axis-label y-axis-label');
      this.svg.append('text').attr('class', 'axis-label x-axis-label');

      this.g.append('g').attr('class', 'percentiles');
      this.g.append('g').attr('class', 'patient-data');
      // Layer for hover effects (focus halo + connector)
      this.g.append('g').attr('class', 'hover-layer');

      this.x = d3.scaleLinear();
      this.y = d3.scaleLinear();
    }

    this.svg
      .attr('width', '100%')
      .attr('height', '100%')
      .attr(
        'viewBox',
        `0 0 ${this.width + 200 } ${this.height + 100}`
      );
      // .attr(
      //   'viewBox',
      //   `0 0 ${this.width + this.MARGIN.left + this.MARGIN.right} ${
      //     this.height + this.MARGIN.top + this.MARGIN.bottom
      //   }`
      // );

    this.g.select('.axis--x').attr('transform', `translate(0,${this.height})`);
    this.g.select('.grid.x').attr('transform', `translate(0,${this.height})`);

    return true;
  }
  drawAxesAndGrid(transition) {
    const chartDetails: any = this.getCurrentChartDetails();
    const numTicks =
      chartDetails.xDomain[1] > 36
        ? 18
        : Math.floor(chartDetails.xDomain[1] / 2);
    this.g
      .select('.grid.y')
      .transition(transition)
      .call(
        d3
          .axisLeft(this.y)
          .tickSize(-this.width)
          .tickFormat((d) => '')
      );
    this.g
      .select('.grid.x')
      .transition(transition)
      .call(
        d3
          .axisBottom(this.x)
          .ticks(numTicks)
          .tickSize(-this.height)
          .tickFormat((d) => '')
      );
    this.g
      .select('.axis.axis--y')
      .transition(transition)
      .call(d3.axisLeft(this.y));
    this.g
      .select('.axis.axis--x')
      .transition(transition)
      .call(d3.axisBottom(this.x).ticks(numTicks));

    let yLabel = chartDetails.yLabel;
    if (chartDetails.yUnit && chartDetails.yUnit !== 'bmi') {
      yLabel += ` (${this.getUnitLabel(chartDetails.yUnit)})`;
    }

    this.svg
      .select('.x-axis-label')
      .attr(
        'transform',
        `translate(${this.MARGIN.left + this.width / 2}, ${
          this.height + this.MARGIN.top + 40
        })`
      )
      .style('text-anchor', 'middle')
      .text(chartDetails.xLabel);

    this.svg
      .select('.y-axis-label')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0)
      .attr('x', 0 - this.height / 2 - this.MARGIN.top)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text(yLabel);
  }

  drawPercentiles(series, transition) {
    const curve = d3.curveLinear; // Temporarily changed from d3.curveMonotoneX for diagnostics
    const line = d3
      .line()
      .x((d: any) => this.x(d.x))
      .y((d: any) => this.y(d.y))
      .curve(curve);
    const percentileContainer = this.g.select('.percentiles');

    // Build outer band using safe min/max between 3rd and 97th at each x to avoid band inversion
    const p3Series = series.find((s) => s.p === 3).values;
    const p97Series = series.find((s) => s.p === 97).values;
    const areaOuter = d3
      .area()
      .x((d: any) => this.x(d.x))
      .curve(curve)
      .y0((d, i) => {
        const y0 = Math.min(
          p3Series[i]?.y ?? Infinity,
          p97Series[i]?.y ?? Infinity
        );
        return this.y(Math.max(0, y0));
      })
      .y1((d, i) => {
        const y1 = Math.max(
          p3Series[i]?.y ?? -Infinity,
          p97Series[i]?.y ?? -Infinity
        );
        return this.y(Math.max(0, y1));
      });

    let pathOuter = percentileContainer
      .selectAll('.percentile-area.outer')
      .data([series[0].values]);
    pathOuter
      .enter()
      .append('path')
      .attr('class', 'percentile-area outer')
      .merge(pathOuter)
      .transition(transition)
      .attr('d', areaOuter);

    // Build inner band (IQR) with safe min/max between 25th and 75th
    const p25Series = series.find((s) => s.p === 25).values;
    const p75Series = series.find((s) => s.p === 75).values;
    const areaInner = d3
      .area()
      .x((d: any) => this.x(d.x))
      .curve(curve)
      .y0((d, i) => {
        const y0 = Math.min(
          p25Series[i]?.y ?? Infinity,
          p75Series[i]?.y ?? Infinity
        );
        return this.y(Math.max(0, y0));
      })
      .y1((d, i) => {
        const y1 = Math.max(
          p25Series[i]?.y ?? -Infinity,
          p75Series[i]?.y ?? -Infinity
        );
        return this.y(Math.max(0, y1));
      });

    let pathInner = percentileContainer
      .selectAll('.percentile-area.inner')
      .data([series[0].values]);
    pathInner
      .enter()
      .append('path')
      .attr('class', 'percentile-area inner')
      .merge(pathInner)
      .transition(transition)
      .attr('d', areaInner);

    const lines = percentileContainer
      .selectAll('.percentile-line')
      .data(series, (d) => d.p);

    lines.exit().transition(transition).attr('stroke-opacity', 0).remove();

    lines
      .enter()
      .append('path')
      .attr('class', 'percentile-line')
      .attr('d', (d) => line(d.values))
      .attr('stroke-opacity', 0)
      .merge(lines)
      .transition(transition)
      .attr('d', (d) => line(d.values))
      .attr('stroke-opacity', 1)
      .attr('stroke', (d) => {
        if (d.p === 50) return 'var(--blue-dark)';
        // visit if (d.p === '120P95') return '#d94801'; // distinct orange-red for 120% P95
        if (d.label === '120% P95') return '#d94801'; // distinct orange-red for 120% P95
        if (d.p >= 99) return '#555'; // darker for ultra-high lines
        return 'var(--blue-mid)';
      })
      .attr('stroke-dasharray', (d) => {
        if (d.p === 50) return 'none';
        //visit if (d.p === '120P95') return '4 2';
        if (d.label === '120% P95') return '4 2';
        if (d.p >= 99) return '2 2';
        return '5 3';
      })
      .attr('class', (d) =>
        d.p === 50 ? 'percentile-line median' : 'percentile-line'
      );

    const labels = percentileContainer
      .selectAll('.percentile-label')
      .data(series, (d) => d.p);

    labels.exit().remove();

    labels
      .enter()
      .append('text')
      .attr('class', 'percentile-label')
      .attr('dy', '0.35em')
      .text((d) =>
        this.state.displayMode === 'zscore'
          ? `${d.z ?? ''}z`
          : d.label || `${d.p}th`
      )
      .merge(labels)
      .transition(transition)
      .attr('x', this.width + 10)
      .attr('y', (d) => this.y(d.values[d.values.length - 1].y))
      .text((d) =>
        this.state.displayMode === 'zscore'
          ? `${d.z ?? ''}z`
          : d.label || `${d.p}th`
      );
  }

  calculateZScoreFromValue(value, xValue, lmsData, chartDetails) {
    // Determine age in months for age-based charts
    const targetX = chartDetails.xLabel.includes('years')
      ? xValue * 12
      : xValue;

    // Linear interpolate LMS between surrounding ages for accuracy
    if (!lmsData || lmsData.length === 0) return null;

    let lowerIndex = 0;
    let upperIndex = lmsData.length - 1;

    // Fast bounds check
    if (targetX <= lmsData[0].x) {
      lowerIndex = 0;
      upperIndex = 0;
    } else if (targetX >= lmsData[lmsData.length - 1].x) {
      lowerIndex = lmsData.length - 1;
      upperIndex = lmsData.length - 1;
    } else {
      // Find bracketing indices
      for (let i = 0; i < lmsData.length - 1; i++) {
        if (lmsData[i].x <= targetX && targetX <= lmsData[i + 1].x) {
          lowerIndex = i;
          upperIndex = i + 1;
          break;
        }
      }
    }

    const lower = lmsData[lowerIndex];
    const upper = lmsData[upperIndex];

    const span = Math.max(upper.x - lower.x, 1e-6);
    const t = upperIndex === lowerIndex ? 0 : (targetX - lower.x) / span;

    const L = lower.L + t * (upper.L - lower.L);
    const M = lower.M + t * (upper.M - lower.M);
    const S = lower.S + t * (upper.S - lower.S);

    // Convert value to metric before calculating Z-score if it's in standard
    let valueInMetric = value;
    if (
      chartDetails.yUnit === 'height' &&
      this.state.units.height === 'standard'
    )
      valueInMetric /= this.CM_TO_IN;
    if (
      chartDetails.yUnit === 'weight' &&
      this.state.units.weight === 'standard'
    )
      valueInMetric /= this.KG_TO_LB;

    const zScore =
      L !== 0
        ? (Math.pow(valueInMetric / M, L) - 1) / (L * S)
        : Math.log(valueInMetric / M) / S;
    return Math.round(zScore * 100) / 100;
  }

  calculatePercentileFromValue(value, xValue, lmsData, chartDetails) {
    const zScore = this.calculateZScoreFromValue(
      value,
      xValue,
      lmsData,
      chartDetails
    );
    if (zScore === null) return null;

    const percentile = ((1 + this.erf(zScore / Math.sqrt(2))) / 2) * 100;
    return Math.round(percentile * 10) / 10;
  }

  erf(x) {
    // Using Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  drawPatientData(patientData, lmsData, transition) {
    if (!patientData) return;

    const chartDetails: any = this.getCurrentChartDetails();
    const xAccessor = (d) => {
      if (chartDetails.xLabel.includes('Age')) {
        return chartDetails.xLabel.includes('months')
          ? d.ageMonths
          : d.ageMonths / 12;
      }
      if (
        chartDetails.patientDataKey === 'weight' &&
        (this.state.chart === 'wt_for_length' ||
          this.state.chart === 'wt_for_stature')
      ) {
        const sourceKey =
          this.state.ageRange === '0to36' ? 'length' : 'stature';
        if (!this.state.patientData[sourceKey]) {
          console.warn(
            `Missing ${sourceKey} data for ${this.state.chart} chart`
          );
          return 0;
        }
        const sourceData = this.state.patientData[sourceKey].find(
          (p) => p.date === d.date
        );
        return sourceData ? sourceData.value : 0;
      }
      return 0;
    };

    const validPatientData = patientData.filter((d) => {
      const xValue = xAccessor(d);
      const { xDomain }: any = this.getCurrentChartDetails();
      return xValue > 0 && xValue >= xDomain[0] && xValue <= xDomain[1];
    });

    const patientContainer = this.g.select('.patient-data');

    let path = patientContainer
      .selectAll('.patient-path')
      .data([validPatientData]);
    path
      .enter()
      .append('path')
      .attr('class', 'patient-path')
      .merge(path)
      .transition(transition)
      .attr(
        'd',
        d3
          .line()
          .x((d) => this.x(xAccessor(d)))
          .y((d: any) => this.y(d.value))
          .curve(d3.curveMonotoneX)
      );

    const points = patientContainer
      .selectAll('.patient-point')
      .data(validPatientData, (d) => d.date);
    //points.exit().transition(transition).attr('r', 0).remove();

    points
      .enter()
      .append('circle')
      .attr('class', 'patient-point')
      //.attr('cy', d => this.y(d.value)).attr('cx', d => this.x(xAccessor(d))).attr('r', 0)
      // .merge(points)
      // .on('mousemove', (event, d) => {
      //     // Bring tooltip in and build content
      //     this.tooltip.interrupt().transition().duration(200).style('opacity', 1);
      //     let tooltipContent = `<div class="tooltip-date">${d.date}</div>`;

      //     if (chartDetails.yUnit === 'bmi') {
      //         tooltipContent += `<div class="tooltip-value">${d.value.toFixed(1)} kg/m²</div>`;
      //     } else if (this.state.chart === 'wt_for_length' || this.state.chart === 'wt_for_stature') {
      //         const xValue = xAccessor(d);
      //         const sourceKey = this.state.chart === 'wt_for_length' ? 'length' : 'stature';

      //         const convertedX = this.convertHeight(xValue, this.state.units.height);
      //         const xUnit = this.getUnitLabel('height');

      //         tooltipContent += `<div class="tooltip-value">Weight: ${d.value.toFixed(1)} ${this.getUnitLabel('weight')}</div>`;
      //         tooltipContent += `<div class="tooltip-value">${sourceKey === 'length' ? 'Length' : 'Stature'}: ${convertedX.toFixed(1)} ${xUnit}</div>`;
      //     } else {
      //         const unitLabel = this.getUnitLabel(chartDetails.yUnit);
      //         tooltipContent += `<div class="tooltip-value">${d.value.toFixed(1)} ${unitLabel}</div>`;
      //     }

      //     if (this.state.displayMode === 'zscore') {
      //         const zScore = this.calculateZScoreFromValue(d.value, xAccessor(d), lmsData, chartDetails);
      //         if (zScore !== null) tooltipContent += `<div class="tooltip-percentile">Z-Score: ${zScore}z</div>`;
      //     } else {
      //         const percentile = this.calculatePercentileFromValue(d.value, xAccessor(d), lmsData, chartDetails);
      //         if (percentile !== null) tooltipContent += `<div class="tooltip-percentile">Percentile: ${percentile}%</div>`;
      //     }

      //     if (d.details) tooltipContent += `<div><small>${d.details}</small></div>`;

      //     // Apply focus styling on the point
      //     d3.select(event.currentTarget).classed('focused', true);

      //     // Position tooltip relative to the data point rather than the mouse
      //     const container = this.myDiv.nativeElement as HTMLElement;
      //     const containerRect = container.getBoundingClientRect();

      //     const xVal = this.x(xAccessor(d));
      //     const yVal = this.y(d.value);

      //     // Page-space coordinates for the point center
      //     const pointPageX = containerRect.left + this.MARGIN.left + xVal;
      //     const pointPageY = containerRect.top + this.MARGIN.top + yVal;

      //     // Set content first to measure size
      //     this.tooltip.html(tooltipContent);
      //     const ttNode = this.tooltip.node();
      //     const ttRect = ttNode.getBoundingClientRect();

      //     // Prefer placing tooltip to the right of the point; adjust vertical centering
      //     const ttLeft = pointPageX + 14;
      //     const ttTop = pointPageY - (ttRect.height / 2);

      //     this.tooltip.style('left', `${ttLeft}px`).style('top', `${ttTop}px`);

      //     // Draw or update connector from point to left-middle of tooltip
      //     const hoverLayer = this.g.select('.hover-layer');

      //     const endX = ttLeft - containerRect.left - this.MARGIN.left; // left edge of tooltip in g coords
      //     const endY = (ttTop + ttRect.height / 2) - containerRect.top - this.MARGIN.top; // center of tooltip

      //     const connector = hoverLayer.selectAll('.tooltip-connector').data([1]);
      //     connector.enter().append('line').attr('class', 'tooltip-connector')
      //         .merge(connector)
      //         .attr('x1', xVal)
      //         .attr('y1', yVal)
      //         .attr('x2', endX)
      //         .attr('y2', endY);

      //     const halo = hoverLayer.selectAll('.focus-halo').data([1]);
      //     halo.enter().append('circle').attr('class', 'focus-halo')
      //         .merge(halo)
      //         .attr('cx', xVal)
      //         .attr('cy', yVal)
      //         .attr('r', 10);

      //     const core = hoverLayer.selectAll('.focus-core').data([1]);
      //     core.enter().append('circle').attr('class', 'focus-core')
      //         .merge(core)
      //         .attr('cx', xVal)
      //         .attr('cy', yVal)
      //         .attr('r', 4.5);
      // })
      // .on('mouseout', (event) => {
      //     this.tooltip.transition().duration(300).style('opacity', 0);
      //     // Remove hover artifacts
      //     this.g.select('.hover-layer').selectAll('.tooltip-connector, .focus-halo, .focus-core').remove();
      //     d3.select(event.currentTarget).classed('focused', false);
      // })
      .transition(transition)
      .attr('r', 4)
      .attr('cx', (d) => this.x(xAccessor(d)))
      .attr('cy', (d) => this.y(d.value));

    this.tooltip = d3
      .select(this.myDiv.nativeElement)
      .append('div')
      .style('position', 'absolute')
      .style('background', 'rgba(0,0,0,0.8)')
      .style('color', '#fff')
      .style('border', '1px solid #222')
      .style('padding', '6px 10px')
      .style('border-radius', '8px')
      .style('pointer-events', 'none')
      .style('font-size', '14px')
      .style('box-shadow', '0 2px 8px rgba(0,0,0,0.25)')
      .style('visibility', 'hidden');

    this.svg
      .selectAll('.patient-point')
      .on('mouseover', (event, d) => {
        let tooltipContent = `<div class="tooltip-date">${d.date}</div>`;

        if (chartDetails.yUnit === 'bmi') {
          tooltipContent += `<div class="tooltip-value">${d.value.toFixed(
            1
          )} kg/m²</div>`;
        } else if (
          this.state.chart === 'wt_for_length' ||
          this.state.chart === 'wt_for_stature'
        ) {
          const xValue = xAccessor(d);
          const sourceKey =
            this.state.chart === 'wt_for_length' ? 'length' : 'stature';

          const convertedX = this.convertHeight(
            xValue,
            this.state.units.height
          );
          const xUnit = this.getUnitLabel('height');

          tooltipContent += `<div class="tooltip-value">Weight: ${d.value.toFixed(
            1
          )} ${this.getUnitLabel('weight')}</div>`;
          tooltipContent += `<div class="tooltip-value">${
            sourceKey === 'length' ? 'Length' : 'Stature'
          }: ${convertedX.toFixed(1)} ${xUnit}</div>`;
        } else {
          const unitLabel = this.getUnitLabel(chartDetails.yUnit);
          tooltipContent += `<div class="tooltip-value">${d.value.toFixed(
            1
          )} ${unitLabel}</div>`;
        }

        if (this.state.displayMode === 'zscore') {
          const zScore = this.calculateZScoreFromValue(
            d.value,
            xAccessor(d),
            lmsData,
            chartDetails
          );
          if (zScore !== null)
            tooltipContent += `<div class="tooltip-percentile">Z-Score: ${zScore}z</div>`;
        } else {
          const percentile = this.calculatePercentileFromValue(
            d.value,
            xAccessor(d),
            lmsData,
            chartDetails
          );
          if (percentile !== null)
            tooltipContent += `<div class="tooltip-percentile">Percentile: ${percentile}%</div>`;
        }

        if (d.details)
          tooltipContent += `<div><small>${d.details}</small></div>`;
        this.tooltip
          .style('visibility', 'visible')
          //.html(`x: ${d.x}<br>y: ${d.y}<br>Label: ${d.label}`);
          .html(tooltipContent);
        d3.select(event.currentTarget)
          .attr('stroke', 'limegreen')
          .attr('stroke-width', 2)
          .attr('filter', 'drop-shadow(0 0 2px limegreen)');
      })
      .on('mousemove', (event) => {
        this.tooltip
          .style('top', event.pageY + 'px')
          .style('left', event.pageX + 10 + 'px');
      })
      .on('mouseout', (event) => {
        this.tooltip.style('visibility', 'hidden');
        d3.select(event.currentTarget)
          .attr('stroke', null)
          .attr('stroke-width', null)
          .attr('filter', null);
      });
  }

  drawChart() {
    if (!this.setupChart()) return;
    if (!this.svg) return;

    const t = this.svg.transition().duration(this.TRANSITION_DURATION);

    if (!this.isDataLoaded) {
      console.log('Data not yet loaded, skipping chart draw');
      return;
    }

    try {
      const lmsData = this.getCachedLMSData();
      if (lmsData.length === 0) {
        const chartDetails: any = this.getCurrentChartDetails();
        this.g.selectAll('*').remove(); // Clear previous chart content
        this.g
          .append('text')
          .attr('x', this.width / 2)
          .attr('y', this.height / 2)
          .attr('text-anchor', 'middle')
          .style('font-size', '16px')
          .text(`Data not available for ${chartDetails.title}`);
        return;
      }

      const series = this.generatePercentileSeries(lmsData);
      const patientData = this.getPatientDataForChart();

      const yMin: any = d3.min(series[0].values, (v: any) => v.y);
      const yMax: any = d3.max(
        series[series.length - 1].values,
        (v: any) => v.y
      );
      const patientMin: any = d3.min(patientData, (d: any) => d.value);
      const patientMax: any = d3.max(patientData, (d: any) => d.value);

      const yDomain = [
        Math.min(yMin, patientMin || Infinity) * 0.9,
        Math.max(yMax, patientMax || -Infinity) * 1.1,
      ];

      this.x
        .domain((this.getCurrentChartDetails() as any).xDomain)
        .range([0, this.width]);
      this.y.domain(yDomain).nice().range([this.height, 0]);

      this.drawAxesAndGrid(t);
      this.drawPercentiles(series, t);
      this.drawPatientData(patientData, lmsData, t);
    } catch (error) {
      console.error('Error processing chart data:', error);
      if (this.g) {
        this.g.selectAll('*').remove();
        this.g
          .append('text')
          .attr('x', this.width / 2)
          .attr('y', this.height / 2)
          .attr('text-anchor', 'middle')
          .style('font-size', '16px')
          .style('fill', 'red')
          .text('Failed to process chart data.');
      }
    }
  }
}
