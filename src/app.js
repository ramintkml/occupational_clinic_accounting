class TherapistAccountingApp {
  constructor() {
    this.therapists = [];
    this.selectedTherapist = null;
    this.currentMonth = new Date();
    this.showAddTherapist = false;
    this.showSummary = false;
    this.showCosts = false;
    this.showCharts = false;
    this.clinicCosts = {};
    
    this.therapistTypes = {
      'کاردرمانگر': { label: 'کاردرمانگر', structure: 'patients', patients: 10 },
      'گفتاردرمان': { label: 'گفتاردرمان', structure: 'count-based', dayPatientPrice: 450, evaluationPrice: 550 }
    };
    
    this.monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    this.init();
  }

  async init() { await this.loadData(); this.render(); }
  
  async loadData() {
    const data = await storage.get();
    this.therapists = data.therapists || [];
    this.clinicCosts = data.clinicCosts || {};
  }

  async saveData() {
    const result = await storage.set({ therapists: this.therapists, clinicCosts: this.clinicCosts });
    if (result.success) { this.showSaveStatus('✓ ذخیره شد'); } else { this.showSaveStatus('خطا در ذخیره'); }
  }

  showSaveStatus(message) {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.display = 'flex';
      setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
    }
  }

  formatNumber(num) { if (!num) return ''; return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  parseFormattedNumber(str) { if (!str) return 0; return parseFloat(str.toString().replace(/,/g, '')) || 0; }
  getDaysInMonth(date) { return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(); }

  gregorianToShamsi(gDate) {
    const gYear = gDate.getFullYear();
    const gMonth = gDate.getMonth() + 1;
    const gDay = gDate.getDate();
    let shamsiYear, shamsiMonth;
    
    if (gMonth > 3 || (gMonth === 3 && gDay >= 21)) { shamsiYear = gYear - 621; } else { shamsiYear = gYear - 622; }
    
    if ((gMonth === 3 && gDay >= 21) || (gMonth === 4 && gDay <= 20)) { shamsiMonth = 0; }
    else if ((gMonth === 4 && gDay >= 21) || (gMonth === 5 && gDay <= 21)) { shamsiMonth = 1; }
    else if ((gMonth === 5 && gDay >= 22) || (gMonth === 6 && gDay <= 21)) { shamsiMonth = 2; }
    else if ((gMonth === 6 && gDay >= 22) || (gMonth === 7 && gDay <= 22)) { shamsiMonth = 3; }
    else if ((gMonth === 7 && gDay >= 23) || (gMonth === 8 && gDay <= 22)) { shamsiMonth = 4; }
    else if ((gMonth === 8 && gDay >= 23) || (gMonth === 9 && gDay <= 22)) { shamsiMonth = 5; }
    else if ((gMonth === 9 && gDay >= 23) || (gMonth === 10 && gDay <= 22)) { shamsiMonth = 6; }
    else if ((gMonth === 10 && gDay >= 23) || (gMonth === 11 && gDay <= 21)) { shamsiMonth = 7; }
    else if ((gMonth === 11 && gDay >= 22) || (gMonth === 12 && gDay <= 21)) { shamsiMonth = 8; }
    else if ((gMonth === 12 && gDay >= 22) || (gMonth === 1 && gDay <= 19)) { shamsiMonth = 9; }
    else if ((gMonth === 1 && gDay >= 20) || (gMonth === 2 && gDay <= 18)) { shamsiMonth = 10; }
    else { shamsiMonth = 11; }
    
    return { year: shamsiYear, month: shamsiMonth };
  }

  addTherapist(name, percentage) {
    if (name.trim()) {
      const newTherapist = { id: Date.now(), name: name, percentage: parseFloat(percentage), type: document.getElementById('therapist-type').value, monthlyData: {} };
      this.therapists.push(newTherapist);
      this.saveData();
      this.showAddTherapist = false;
      this.render();
    }
  }

  deleteTherapist(id) {
    if (confirm('آیا از حذف این درمانگر اطمینان دارید؟')) {
      this.therapists = this.therapists.filter(t => t.id !== id);
      if (this.selectedTherapist && this.selectedTherapist.id === id) { this.selectedTherapist = null; }
      this.saveData();
      this.render();
    }
  }

  updateCost(therapistId, day, patientIndex, cost) {
    const therapist = this.therapists.find(t => t.id === therapistId);
    if (therapist) {
      const shamsiDate = this.gregorianToShamsi(this.currentMonth);
      const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
      if (!therapist.monthlyData[monthKey]) { therapist.monthlyData[monthKey] = {}; }
      if (!therapist.monthlyData[monthKey][day]) { therapist.monthlyData[monthKey][day] = {}; }
      therapist.monthlyData[monthKey][day][patientIndex] = this.parseFormattedNumber(cost);
      this.saveData();
      this.render();
    }
  }

  updateCountField(therapistId, day, field, value) {
    const therapist = this.therapists.find(t => t.id === therapistId);
    if (therapist) {
      const shamsiDate = this.gregorianToShamsi(this.currentMonth);
      const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
      if (!therapist.monthlyData[monthKey]) { therapist.monthlyData[monthKey] = {}; }
      if (!therapist.monthlyData[monthKey][day]) { therapist.monthlyData[monthKey][day] = {}; }
      therapist.monthlyData[monthKey][day][field] = this.parseFormattedNumber(value);
      this.saveData();
      this.render();
    }
  }

  updatePercentage(therapistId, newPercent) {
    const therapist = this.therapists.find(t => t.id === therapistId);
    if (therapist) { therapist.percentage = parseFloat(newPercent); this.saveData(); this.render(); }
  }

  calculateTherapistIncome(therapist) {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    const monthData = therapist.monthlyData[monthKey] || {};
    let total = 0;
    const typeInfo = this.therapistTypes[therapist.type] || this.therapistTypes['کاردرمانگر'];
    
    if (typeInfo.structure === 'count-based') {
      Object.values(monthData).forEach(day => {
        const dayPatients = day.dayPatients || 0;
        const evaluations = day.evaluations || 0;
        total += (dayPatients * typeInfo.dayPatientPrice) + (evaluations * typeInfo.evaluationPrice);
      });
    } else {
      Object.values(monthData).forEach(day => {
        for (let i = 0; i < typeInfo.patients; i++) { total += day[i] || 0; }
      });
    }
    
    return { total, therapistShare: (total * therapist.percentage) / 100, clinicShare: (total * (100 - therapist.percentage)) / 100 };
  }

  getCost(therapist, day, patientIndex) {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    return therapist.monthlyData[monthKey]?.[day]?.[patientIndex] || '';
  }

  getCountField(therapist, day, field) {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    return therapist.monthlyData[monthKey]?.[day]?.[field] || '';
  }

  calculateDayTotal(therapist, day) {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    const dayData = therapist.monthlyData[monthKey]?.[day] || {};
    const typeInfo = this.therapistTypes[therapist.type] || this.therapistTypes['کاردرمانگر'];
    
    if (typeInfo.structure === 'count-based') {
      const dayPatients = dayData.dayPatients || 0;
      const evaluations = dayData.evaluations || 0;
      return (dayPatients * typeInfo.dayPatientPrice) + (evaluations * typeInfo.evaluationPrice);
    } else {
      let total = 0;
      for (let i = 0; i < typeInfo.patients; i++) { total += dayData[i] || 0; }
      return total;
    }
  }

  changeMonth(direction) {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + direction, 1);
    this.render();
  }

  toggleAddTherapist() { this.showAddTherapist = !this.showAddTherapist; this.render(); }
  toggleSummary() { this.showSummary = !this.showSummary; this.render(); }
  toggleCosts() { this.showCosts = !this.showCosts; this.render(); }
  toggleCharts() { this.showCharts = !this.showCharts; this.render(); }

  addClinicCost() {
    const name = prompt('نام هزینه (مثلاً: اجاره، حقوق منشی):');
    if (!name || !name.trim()) return;
    const amount = prompt('مبلغ ماهانه (تومان):');
    if (!amount || isNaN(amount)) return;
    const costId = Date.now().toString();
    if (!this.clinicCosts.items) { this.clinicCosts.items = {}; }
    this.clinicCosts.items[costId] = { id: costId, name: name.trim(), amount: parseFloat(amount) };
    this.saveData();
    this.render();
  }

  deleteClinicCost(costId) {
    if (confirm('آیا از حذف این هزینه اطمینان دارید؟')) {
      delete this.clinicCosts.items[costId];
      this.saveData();
      this.render();
    }
  }

  getMonthlyClinicCosts() {
    if (!this.clinicCosts.items) return 0;
    return Object.values(this.clinicCosts.items).reduce((sum, cost) => sum + cost.amount, 0);
  }

  getClinicRawIncome() {
    const totalIncome = this.therapists.reduce((sum, t) => {
      const income = this.calculateTherapistIncome(t);
      return sum + income.clinicShare;
    }, 0);
    return totalIncome - this.getMonthlyClinicCosts();
  }

  getHistoricalData() {
    const data = {};
    const currentDate = new Date(this.currentMonth);
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const shamsiDate = this.gregorianToShamsi(month);
      const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
      const monthLabel = `${this.monthNames[shamsiDate.month]} ${shamsiDate.year}`;
      
      data[monthKey] = { label: monthLabel, therapists: {}, clinicRaw: 0 };
      
      this.therapists.forEach(therapist => {
        const monthData = therapist.monthlyData[monthKey] || {};
        let total = 0;
        const typeInfo = this.therapistTypes[therapist.type] || this.therapistTypes['کاردرمانگر'];
        
        if (typeInfo.structure === 'count-based') {
          Object.values(monthData).forEach(day => {
            const dayPatients = day.dayPatients || 0;
            const evaluations = day.evaluations || 0;
            total += (dayPatients * typeInfo.dayPatientPrice) + (evaluations * typeInfo.evaluationPrice);
          });
        } else {
          Object.values(monthData).forEach(day => {
            for (let j = 0; j < typeInfo.patients; j++) { total += day[j] || 0; }
          });
        }
        
        const therapistShare = (total * therapist.percentage) / 100;
        const clinicShare = (total * (100 - therapist.percentage)) / 100;
        
        data[monthKey].therapists[therapist.id] = { name: therapist.name, income: therapistShare };
        data[monthKey].clinicRaw += clinicShare;
      });
      
      data[monthKey].clinicRaw -= this.getMonthlyClinicCosts();
    }
    
    return data;
  }
  submitTherapist() {
    const name = document.getElementById('therapist-name').value;
    const percent = document.getElementById('therapist-percent').value;
    this.addTherapist(name, percent);
  }

  selectTherapist(id) {
    this.selectedTherapist = this.therapists.find(t => t.id === id);
    this.render();
  }

  importExcel(therapistId) {
    this.currentImportTherapistId = therapistId;
    const fileInput = document.getElementById('excel-file-input');
    if (fileInput) { fileInput.click(); }
  }

  async handleExcelFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const therapist = this.therapists.find(t => t.id === this.currentImportTherapistId);
      if (!therapist) { alert('خطا: درمانگر یافت نشد'); return; }
      const typeInfo = this.therapistTypes[therapist.type] || this.therapistTypes['کاردرمانگر'];
      let importedMonths = 0;
      
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        const parts = sheetName.trim().split(' ');
        const monthName = parts[0];
        const monthIndex = this.monthNames.indexOf(monthName);
        if (monthIndex === -1) { console.warn(`نام ماه نامعتبر: ${sheetName}`); return; }
        const year = parts[1] ? parseInt(parts[1]) : 1403;
        const monthKey = `${year}-${monthIndex + 1}`;
        if (!therapist.monthlyData[monthKey]) { therapist.monthlyData[monthKey] = {}; }
        
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length === 0) continue;
          const day = row[0];
          if (!day || isNaN(day)) continue;
          if (!therapist.monthlyData[monthKey][day]) { therapist.monthlyData[monthKey][day] = {}; }
          
          if (typeInfo.structure === 'count-based') {
            const dayPatients = row[1];
            const evaluations = row[3];
            if (dayPatients && !isNaN(dayPatients)) { therapist.monthlyData[monthKey][day].dayPatients = parseFloat(dayPatients); }
            if (evaluations && !isNaN(evaluations)) { therapist.monthlyData[monthKey][day].evaluations = parseFloat(evaluations); }
          } else {
            for (let patientIndex = 0; patientIndex < typeInfo.patients; patientIndex++) {
              const cellValue = row[patientIndex + 1];
              if (cellValue && !isNaN(cellValue)) { therapist.monthlyData[monthKey][day][patientIndex] = parseFloat(cellValue); }
            }
          }
        }
        importedMonths++;
      });
      
      await this.saveData();
      alert(`✓ داده‌ها با موفقیت وارد شدند!\n${importedMonths} ماه پردازش شد.`);
      event.target.value = '';
      this.render();
    } catch (error) {
      console.error('خطا در خواندن فایل:', error);
      alert('خطا در خواندن فایل اکسل. لطفا فرمت فایل را بررسی کنید.');
    }
  }

  handleCellNavigation(event, currentDay, currentPatient, patientsCount) {
    const key = event.key;
    const daysInMonth = this.getDaysInMonth(this.currentMonth);
    if (key === 'Enter') {
      event.preventDefault();
      const targetDay = currentDay < daysInMonth ? currentDay + 1 : 1;
      this.focusCell(targetDay, currentPatient);
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      const targetPatient = currentPatient > 0 ? currentPatient - 1 : patientsCount - 1;
      this.focusCell(currentDay, targetPatient);
    } else if (key === 'ArrowLeft') {
      event.preventDefault();
      const targetPatient = currentPatient < patientsCount - 1 ? currentPatient + 1 : 0;
      this.focusCell(currentDay, targetPatient);
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      const targetDay = currentDay < daysInMonth ? currentDay + 1 : 1;
      this.focusCell(targetDay, currentPatient);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      const targetDay = currentDay > 1 ? currentDay - 1 : daysInMonth;
      this.focusCell(targetDay, currentPatient);
    }
  }

  focusCell(day, patient) {
    setTimeout(() => {
      const input = document.querySelector(`input.cost-input[data-day="${day}"][data-patient="${patient}"]`);
      if (input) { input.focus(); input.select(); }
    }, 10);
  }

  handleCountBasedNavigation(event, currentDay, currentField) {
    const key = event.key;
    const daysInMonth = this.getDaysInMonth(this.currentMonth);
    if (key === 'Enter') {
      event.preventDefault();
      const targetDay = currentDay < daysInMonth ? currentDay + 1 : 1;
      this.focusCountField(targetDay, currentField);
    } else if (key === 'ArrowRight' && currentField === 'dayPatients') {
      event.preventDefault();
      this.focusCountField(currentDay, 'evaluations');
    } else if (key === 'ArrowLeft' && currentField === 'evaluations') {
      event.preventDefault();
      this.focusCountField(currentDay, 'dayPatients');
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      const targetDay = currentDay < daysInMonth ? currentDay + 1 : 1;
      this.focusCountField(targetDay, currentField);
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      const targetDay = currentDay > 1 ? currentDay - 1 : daysInMonth;
      this.focusCountField(targetDay, currentField);
    }
  }

  focusCountField(day, field) {
    setTimeout(() => {
      const input = document.querySelector(`input[data-day="${day}"][data-field="${field}"]`);
      if (input) { input.focus(); input.select(); }
    }, 10);
  }

  render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="container">
        <div class="header">
          <h1>سیستم حسابداری درمانگران</h1>
          <div id="save-status" class="save-status" style="display: none;">
            <span class="material-icons" style="font-size: 18px;">save</span>
            <span></span>
          </div>
        </div>
        <div class="button-group">
          <button class="btn btn-primary" onclick="app.toggleAddTherapist()">
            <span class="material-icons" style="font-size: 18px;">person_add</span>
            افزودن درمانگر
          </button>
          <button class="btn btn-success" onclick="app.toggleSummary()">
            <span class="material-icons" style="font-size: 18px;">${this.showSummary ? 'visibility_off' : 'visibility'}</span>
            ${this.showSummary ? 'مخفی کردن گزارش' : 'نمایش گزارش کلی'}
          </button>
          <button class="btn btn-primary" onclick="app.toggleCosts()">
            <span class="material-icons" style="font-size: 18px;">payments</span>
            ${this.showCosts ? 'مخفی کردن هزینه‌ها' : 'مدیریت هزینه‌های مطب'}
          </button>
          <button class="btn btn-success" onclick="app.toggleCharts()">
            <span class="material-icons" style="font-size: 18px;">show_chart</span>
            ${this.showCharts ? 'مخفی کردن نمودار' : 'نمایش نمودار درآمد'}
          </button>
        </div>
        ${this.showAddTherapist ? this.renderAddTherapistForm() : ''}
        ${this.showCosts ? this.renderClinicCosts() : ''}
        ${this.showSummary ? this.renderSummary() : ''}
        ${this.showCharts ? this.renderCharts() : ''}
        ${this.renderTherapistGrid()}
        ${this.selectedTherapist ? this.renderTable() : ''}
      </div>
    `;
  }

  renderAddTherapistForm() {
    return `<div class="form-section"><h3>افزودن درمانگر جدید</h3><div class="form-group"><input type="text" id="therapist-name" class="input" placeholder="نام درمانگر" style="flex: 1;"><select id="therapist-type" class="input" style="width: 150px;"><option value="کاردرمانگر">کاردرمانگر</option><option value="گفتاردرمان">گفتاردرمان</option></select><div style="display: flex; align-items: center; gap: 10px;"><input type="number" id="therapist-percent" class="input" value="50" min="0" max="100" style="width: 80px;"><span class="material-icons" style="font-size: 18px; color: #718096;">percent</span><span>سهم</span></div><button class="btn btn-primary" onclick="app.submitTherapist()">افزودن</button></div></div>`;
  }

  renderClinicCosts() {
    const costs = this.clinicCosts.items || {};
    const totalCosts = this.getMonthlyClinicCosts();
    return `<div class="form-section" style="background: #fff5f5; border: 2px solid #feb2b2;"><div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;"><h3 style="color: #c53030; margin: 0;">هزینه‌های ماهانه مطب</h3><button class="btn btn-primary" onclick="app.addClinicCost()"><span class="material-icons" style="font-size: 18px;">add</span>افزودن هزینه</button></div>${Object.keys(costs).length === 0 ? '<p style="color: #718096; text-align: center; padding: 20px;">هیچ هزینه‌ای ثبت نشده است</p>' : `<div style="display: grid; gap: 12px; margin-bottom: 20px;">${Object.values(costs).map(cost => `<div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;"><div><strong style="font-size: 1.1rem;">${cost.name}</strong><div style="color: #718096; margin-top: 4px;">${this.formatNumber(cost.amount)} تومان/ماه</div></div><button class="btn btn-danger" onclick="app.deleteClinicCost('${cost.id}')"><span class="material-icons" style="font-size: 16px;">delete</span></button></div>`).join('')}</div><div style="background: #fed7d7; padding: 15px; border-radius: 8px; text-align: center;"><div style="color: #742a2a; font-size: 0.9rem; margin-bottom: 5px;">مجموع هزینه‌های ماهانه</div><div style="color: #c53030; font-size: 1.8rem; font-weight: bold;">${this.formatNumber(totalCosts)} تومان</div></div>`}</div>`;
  }

  renderSummary() {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthName = this.monthNames[shamsiDate.month];
    const year = shamsiDate.year;
    const totalIncome = this.therapists.reduce((sum, t) => sum + this.calculateTherapistIncome(t).total, 0);
    const totalClinicShare = this.therapists.reduce((sum, t) => sum + this.calculateTherapistIncome(t).clinicShare, 0);
    const clinicCosts = this.getMonthlyClinicCosts();
    const rawClinicIncome = totalClinicShare - clinicCosts;
    return `<div class="summary-section"><h3 style="margin-bottom: 20px; color: #22543d; font-size: 1.3rem;">گزارش ${monthName} ${year}</h3><div class="summary-grid">${this.therapists.map(t => {const i = this.calculateTherapistIncome(t); return `<div class="summary-card"><div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 10px;">${t.name}</div><div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; font-size: 14px;"><div><span style="color: #718096;">کل درآمد: </span><strong>${this.formatNumber(i.total)} تومان</strong></div><div><span style="color: #718096;">سهم درمانگر (${t.percentage}٪): </span><strong style="color: #48bb78;">${this.formatNumber(i.therapistShare)} تومان</strong></div><div><span style="color: #718096;">سهم مطب: </span><strong style="color: #4299e1;">${this.formatNumber(i.clinicShare)} تومان</strong></div></div></div>`;}).join('')}<div style="background: #e6fffa; padding: 20px; border-radius: 10px; font-weight: bold; font-size: 1.1rem;"><div style="margin-bottom: 10px;">مجموع کل: ${this.formatNumber(totalIncome)} تومان</div><div style="margin-bottom: 10px;">سهم مطب: ${this.formatNumber(totalClinicShare)} تومان</div><div style="margin-bottom: 10px; color: #e53e3e;">هزینه‌های مطب: ${this.formatNumber(clinicCosts)} تومان</div><div style="padding-top: 10px; border-top: 2px solid #38a169; color: #22543d;">درآمد خالص مطب: ${this.formatNumber(rawClinicIncome)} تومان</div></div></div></div>`;
  }
  renderCharts() {
    const historicalData = this.getHistoricalData();
    const months = Object.keys(historicalData);
    const labels = months.map(m => historicalData[m].label);
    let therapistCharts = '';
    
    this.therapists.forEach(therapist => {
      const data = months.map(m => historicalData[m].therapists[therapist.id]?.income || 0);
      const maxValue = Math.max(...data, 1);
      therapistCharts += `<div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 20px;"><h4 style="margin-bottom: 20px; color: #2d3748; font-size: 1.2rem;">${therapist.name}</h4><div style="height: 200px; display: flex; align-items: flex-end; gap: 10px; padding: 10px; border-bottom: 2px solid #e2e8f0;">${data.map((value, idx) => {const height = (value / maxValue) * 100; return `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;"><div style="font-size: 11px; color: #38a169; font-weight: bold;">${this.formatNumber(value)}</div><div style="width: 100%; background: linear-gradient(180deg, #48bb78 0%, #38a169 100%); height: ${height}%; border-radius: 4px 4px 0 0; min-height: 5px; transition: all 0.3s;" title="${this.formatNumber(value)} تومان"></div><div style="font-size: 10px; color: #718096; text-align: center; writing-mode: vertical-rl; transform: rotate(180deg);">${labels[idx]}</div></div>`;}).join('')}</div></div>`;
    });
    
    const clinicData = months.map(m => historicalData[m].clinicRaw);
    const clinicMaxValue = Math.max(...clinicData.map(Math.abs), 1);
    return `<div style="background: #f7fafc; padding: 25px; border-radius: 12px; margin-bottom: 30px;"><h3 style="margin-bottom: 25px; color: #2d3748; font-size: 1.4rem;"><span class="material-icons" style="vertical-align: middle; margin-left: 8px;">show_chart</span>نمودار درآمد 6 ماه اخیر</h3>${therapistCharts}<div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"><h4 style="margin-bottom: 20px; color: #2d3748; font-size: 1.2rem;">درآمد خالص مطب (پس از کسر هزینه‌ها)</h4><div style="height: 200px; display: flex; align-items: flex-end; gap: 10px; padding: 10px; border-bottom: 2px solid #e2e8f0;">${clinicData.map((value, idx) => {const isNegative = value < 0; const absValue = Math.abs(value); const height = (absValue / clinicMaxValue) * 100; const color = isNegative ? 'linear-gradient(180deg, #f56565 0%, #e53e3e 100%)' : 'linear-gradient(180deg, #4299e1 0%, #3182ce 100%)'; return `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;"><div style="font-size: 11px; color: ${isNegative ? '#e53e3e' : '#3182ce'}; font-weight: bold;">${this.formatNumber(value)}</div><div style="width: 100%; background: ${color}; height: ${height}%; border-radius: 4px 4px 0 0; min-height: 5px; transition: all 0.3s;" title="${this.formatNumber(value)} تومان"></div><div style="font-size: 10px; color: #718096; text-align: center; writing-mode: vertical-rl; transform: rotate(180deg);">${labels[idx]}</div></div>`;}).join('')}</div></div></div>`;
  }

  renderTherapistGrid() {
    return `<div class="therapist-grid">${this.therapists.map(t => {const i = this.calculateTherapistIncome(t); const a = this.selectedTherapist?.id === t.id; const ti = this.therapistTypes[t.type] || this.therapistTypes['گفتاردرمان']; return `<div class="therapist-card ${a ? 'active' : ''}" onclick="app.selectTherapist(${t.id})"><div class="therapist-header"><div style="display: flex; align-items: center; gap: 10px;"><span class="material-icons" style="font-size: 28px; color: #3182ce;">account_circle</span><div><strong style="font-size: 1.1rem;">${t.name}</strong><div style="font-size: 12px; color: #718096; margin-top: 2px;">${ti.label}</div></div></div><div style="display: flex; gap: 8px;"><button class="btn btn-success" style="padding: 6px 12px;" onclick="event.stopPropagation(); app.importExcel(${t.id})"><span class="material-icons" style="font-size: 16px;">upload_file</span></button><button class="btn btn-danger" onclick="event.stopPropagation(); app.deleteTherapist(${t.id})"><span class="material-icons" style="font-size: 16px;">delete</span></button></div></div><div class="therapist-info"><div style="font-size: 14px; display: flex; align-items: center; gap: 6px;"><span class="material-icons" style="font-size: 16px; color: #718096;">percent</span><span>سهم: ${t.percentage}٪</span></div><div style="font-size: 14px; display: flex; align-items: center; gap: 6px;"><span class="material-icons" style="font-size: 16px; color: #718096;">account_balance_wallet</span><span>درآمد: ${this.formatNumber(i.therapistShare)} تومان</span></div></div></div>`;}).join('')}</div><input type="file" id="excel-file-input" accept=".xlsx,.xls" style="display: none;" onchange="app.handleExcelFile(event)">`;
  }

  renderTable() {
    const ti = this.therapistTypes[this.selectedTherapist.type] || this.therapistTypes['کاردرمانگر'];
    if (ti.structure === 'count-based') { return this.renderCountBasedTable(this.selectedTherapist, ti); }
    else { return this.renderPatientBasedTable(this.selectedTherapist, ti); }
  }
  renderCountBasedTable(t, ti) {
    const i = this.calculateTherapistIncome(t);
    const sd = this.gregorianToShamsi(this.currentMonth);
    const mn = this.monthNames[sd.month];
    const y = sd.year;
    const dim = this.getDaysInMonth(this.currentMonth);
    return `<div class="table-section"><div class="table-header"><h2>${t.name} - ${ti.label}</h2><div class="percentage-control"><label style="font-size: 14px;">سهم درمانگر:</label><input type="number" value="${t.percentage}" min="0" max="100" class="input" style="width: 80px;" onchange="app.updatePercentage(${t.id}, this.value)"><span class="material-icons" style="font-size: 18px; color: #718096;">percent</span></div></div><div class="month-navigation"><button class="btn btn-primary" onclick="app.changeMonth(-1)"><span class="material-icons" style="font-size: 18px;">chevron_right</span>ماه قبل</button><div class="month-display"><span class="material-icons" style="font-size: 28px; color: #3182ce;">calendar_today</span><span>${mn} ${y}</span></div><button class="btn btn-primary" onclick="app.changeMonth(1)">ماه بعد<span class="material-icons" style="font-size: 18px;">chevron_left</span></button></div><div class="table-container"><table><thead><tr><th style="position: sticky; right: 0; z-index: 11;">تاریخ</th><th>تعداد بیماران روزانه</th><th>مبلغ بیماران (${ti.dayPatientPrice})</th><th>تعداد ارزیابی</th><th>مبلغ ارزیابی (${ti.evaluationPrice})</th><th>جمع روزانه</th></tr></thead><tbody>${Array.from({length: dim}, (_, idx) => {const d = idx + 1; const dp = this.getCountField(t, d, 'dayPatients'); const ev = this.getCountField(t, d, 'evaluations'); const dpt = (dp || 0) * ti.dayPatientPrice; const evt = (ev || 0) * ti.evaluationPrice; const dt = this.calculateDayTotal(t, d); return `<tr><td class="day-cell">${d}</td><td><input type="text" class="cost-input" value="${this.formatNumber(dp)}" placeholder="0" data-day="${d}" data-field="dayPatients" onchange="app.updateCountField(${t.id}, ${d}, 'dayPatients', this.value)" onkeydown="app.handleCountBasedNavigation(event, ${d}, 'dayPatients')"></td><td style="background: #f7fafc; text-align: center; font-weight: 600;">${this.formatNumber(dpt)}</td><td><input type="text" class="cost-input" value="${this.formatNumber(ev)}" placeholder="0" data-day="${d}" data-field="evaluations" onchange="app.updateCountField(${t.id}, ${d}, 'evaluations', this.value)" onkeydown="app.handleCountBasedNavigation(event, ${d}, 'evaluations')"></td><td style="background: #f7fafc; text-align: center; font-weight: 600;">${this.formatNumber(evt)}</td><td style="background: #ebf8ff; text-align: center; font-weight: 700; color: #3182ce;">${this.formatNumber(dt)} تومان</td></tr>`;}).join('')}</tbody></table></div><div class="income-summary"><div class="income-grid"><div class="income-item"><div class="income-label">کل درآمد ماه</div><div class="income-value income-total">${this.formatNumber(i.total)}</div><div class="income-unit">تومان</div></div><div class="income-item"><div class="income-label">سهم درمانگر (${t.percentage}٪)</div><div class="income-value income-therapist">${this.formatNumber(i.therapistShare)}</div><div class="income-unit">تومان</div></div><div class="income-item"><div class="income-label">سهم مطب</div><div class="income-value income-clinic">${this.formatNumber(i.clinicShare)}</div><div class="income-unit">تومان</div></div></div></div></div>`;
  }

    renderPatientBasedTable(t, ti) {
      const i = this.calculateTherapistIncome(t);
      const sd = this.gregorianToShamsi(this.currentMonth);
      const mn = this.monthNames[sd.month];
      const y = sd.year;
      const dim = this.getDaysInMonth(this.currentMonth);
      const pc = ti.patients;
      return `<div class="table-section"><div class="table-header"><h2>${t.name} - ${ti.label}</h2><div class="percentage-control"><label style="font-size: 14px;">سهم درمانگر:</label><input type="number" value="${t.percentage}" min="0" max="100" class="input" style="width: 80px;" onchange="app.updatePercentage(${t.id}, this.value)"><span class="material-icons" style="font-size: 18px; color: #718096;">percent</span></div></div><div class="month-navigation"><button class="btn btn-primary" onclick="app.changeMonth(-1)"><span class="material-icons" style="font-size: 18px;">chevron_right</span>ماه قبل</button><div class="month-display"><span class="material-icons" style="font-size: 28px; color: #3182ce;">calendar_today</span><span>${mn} ${y}</span></div><button class="btn btn-primary" onclick="app.changeMonth(1)">ماه بعد<span class="material-icons" style="font-size: 18px;">chevron_left</span></button></div><div class="table-container"><table><thead><tr><th style="position: sticky; right: 0; z-index: 11;">تاریخ</th>${Array.from({length: pc}, (_, i) => `<th>بیمار ${pc - i}</th>`).join('')}<th>جمع روزانه</th></tr></thead><tbody>${Array.from({length: dim}, (_, idx) => {const d = idx + 1; const dt = this.calculateDayTotal(t, d); return `<tr><td class="day-cell">${d}</td>${Array.from({length: pc}, (_, i) => {const j = pc - 1 - i; const c = this.getCost(t, d, j); return `<td><div class="cost-cell"><input type="text" class="cost-input" value="${this.formatNumber(c)}" placeholder="0" data-day="${d}" data-patient="${j}" data-therapist="${t.id}" data-max-patient="${pc - 1}" onchange="app.updateCost(${t.id}, ${d}, ${j}, this.value)" onkeydown="app.handleCellNavigation(event, ${d}, ${j}, ${pc})"><span class="currency-label">تومان</span></div></td>`;}).join('')}<td style="background: #ebf8ff; text-align: center; font-weight: 700; color: #3182ce;">${this.formatNumber(dt)} تومان</td></tr>`;}).join('')}</tbody></table></div><div class="income-summary"><div class="income-grid"><div class="income-item"><div class="income-label">کل درآمد ماه</div><div class="income-value income-total">${this.formatNumber(i.total)}</div><div class="income-unit">تومان</div></div><div class="income-item"><div class="income-label">سهم درمانگر (${t.percentage}٪)</div><div class="income-value income-therapist">${this.formatNumber(i.therapistShare)}</div><div class="income-unit">تومان</div></div><div class="income-item"><div class="income-label">سهم مطب</div><div class="income-value income-clinic">${this.formatNumber(i.clinicShare)}</div><div class="income-unit">تومان</div></div></div></div></div>`;
    }
  }
  
  const app = new TherapistAccountingApp();