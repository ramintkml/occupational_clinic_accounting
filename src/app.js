class TherapistAccountingApp {
  constructor() {
    this.therapists = [];
    this.selectedTherapist = null;
    this.currentMonth = new Date();
    this.showAddTherapist = false;
    this.showSummary = false;
    this.showCosts = false;
    this.showCharts = false;
    this.showExport = false;
    this.clinicCosts = {};
    this.budgets = {};
    
    this.users = {
      'admin': { password: 'admin123', role: 'admin', name: 'مدیر' },
      'secretary': { password: 'sec123', role: 'secretary', name: 'منشی' }
    };
    this.currentUser = null;
    this.showLogin = true;
    
    this.expenseCategories = {
      'rent': { label: 'اجاره و شارژ', icon: 'home', color: '#e53e3e' },
      'salary': { label: 'حقوق و دستمزد', icon: 'people', color: '#dd6b20' },
      'utilities': { label: 'آب و برق و گاز', icon: 'bolt', color: '#d69e2e' },
      'supplies': { label: 'لوازم مصرفی', icon: 'inventory_2', color: '#38a169' },
      'maintenance': { label: 'تعمیرات و نگهداری', icon: 'build', color: '#3182ce' },
      'other': { label: 'سایر هزینه‌ها', icon: 'more_horiz', color: '#805ad5' }
    };
    
    this.therapistTypes = {
      'کاردرمانگر': { label: 'کاردرمانگر', structure: 'patients', patients: 10 },
      'گفتاردرمان': { label: 'گفتاردرمان', structure: 'count-based', dayPatientPrice: 450, evaluationPrice: 550 }
    };
    
    this.monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
    this.pendingFocus = null; // Track where to focus after render
    this.init();
  }

  async init() {
    // Check for saved login
    this.loadLoginState();
    await this.loadData();
    this.render();
  }
  
  // LOGIN PERSISTENCE
  loadLoginState() {
    try {
      const saved = localStorage.getItem('clinic_user');
      if (saved) {
        const userData = JSON.parse(saved);
        // Verify user still exists
        if (this.users[userData.username]) {
          this.currentUser = userData;
          this.showLogin = false;
        }
      }
    } catch (e) {
      console.log('No saved login state');
    }
  }
  
  saveLoginState() {
    try {
      if (this.currentUser) {
        localStorage.setItem('clinic_user', JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem('clinic_user');
      }
    } catch (e) {
      console.log('Could not save login state');
    }
  }
  
  async loadData() {
    const data = await storage.get();
    this.therapists = data.therapists || [];
    this.clinicCosts = data.clinicCosts || {};
    this.budgets = data.budgets || {};
    if (this.clinicCosts.items) {
      Object.values(this.clinicCosts.items).forEach(cost => {
        if (!cost.category) cost.category = 'other';
      });
    }
  }

  async saveData() {
    const result = await storage.set({ therapists: this.therapists, clinicCosts: this.clinicCosts, budgets: this.budgets });
    if (result.success) { this.showSaveStatus('✓ ذخیره شد'); } else { this.showSaveStatus('خطا در ذخیره'); }
  }

  login(username, password) {
    const user = this.users[username];
    if (user && user.password === password) {
      this.currentUser = { username, ...user };
      this.showLogin = false;
      this.saveLoginState();
      this.render();
      return true;
    }
    alert('نام کاربری یا رمز عبور اشتباه است');
    return false;
  }
  
  logout() {
    this.currentUser = null;
    this.showLogin = true;
    this.selectedTherapist = null;
    this.showAddTherapist = false;
    this.showSummary = false;
    this.showCosts = false;
    this.showCharts = false;
    this.showExport = false;
    this.saveLoginState();
    this.render();
  }
  
  isAdmin() { return this.currentUser?.role === 'admin'; }
  isSecretary() { return this.currentUser?.role === 'secretary'; }
  canEdit() { return this.isAdmin(); }
  canAddSalary() { return this.isAdmin() || this.isSecretary(); }

  showSaveStatus(message) {
    const statusEl = document.getElementById('save-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.style.display = 'flex';
      setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
    }
  }

  formatNumber(num) { 
    if (!num && num !== 0) return ''; 
    return Math.round(num).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); 
  }
  parseFormattedNumber(str) { 
    if (!str) return 0; 
    return Math.round(parseFloat(str.toString().replace(/,/g, '')) || 0); 
  }
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

  setMonth(year, month) {
    const gYear = year + 621;
    const gMonth = (month + 2) % 12;
    this.currentMonth = new Date(gYear, gMonth, 15);
    this.render();
  }

  addTherapist(name, percentage) {
    if (!this.canEdit()) { alert('شما دسترسی به این عملیات را ندارید'); return; }
    if (name.trim()) {
      const newTherapist = { id: Date.now(), name: name, percentage: parseFloat(percentage), type: document.getElementById('therapist-type').value, monthlyData: {} };
      this.therapists.push(newTherapist);
      this.saveData();
      this.showAddTherapist = false;
      this.render();
    }
  }

  deleteTherapist(id) {
    if (!this.canEdit()) { alert('شما دسترسی به این عملیات را ندارید'); return; }
    if (confirm('آیا از حذف این درمانگر اطمینان دارید؟')) {
      this.therapists = this.therapists.filter(t => t.id !== id);
      if (this.selectedTherapist && this.selectedTherapist.id === id) { this.selectedTherapist = null; }
      this.saveData();
      this.render();
    }
  }

  // FIXED: Update cost WITHOUT re-rendering (just update data and cell display)
  updateCostDirect(therapistId, day, patientIndex, inputEl) {
    if (!this.canAddSalary()) return;
    const therapist = this.therapists.find(t => t.id === therapistId);
    if (therapist) {
      const shamsiDate = this.gregorianToShamsi(this.currentMonth);
      const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
      if (!therapist.monthlyData[monthKey]) { therapist.monthlyData[monthKey] = {}; }
      if (!therapist.monthlyData[monthKey][day]) { therapist.monthlyData[monthKey][day] = {}; }
      const value = this.parseFormattedNumber(inputEl.value);
      therapist.monthlyData[monthKey][day][patientIndex] = value;
      // Update the total cell for this row
      this.updateRowTotal(therapist, day);
    }
  }
  
  // Save on blur
  saveCostOnBlur(therapistId, day, patientIndex, inputEl) {
    this.updateCostDirect(therapistId, day, patientIndex, inputEl);
    this.saveData();
    this.updateIncomeSummary();
  }

  updateCountFieldDirect(therapistId, day, field, inputEl) {
    if (!this.canAddSalary()) return;
    const therapist = this.therapists.find(t => t.id === therapistId);
    if (therapist) {
      const shamsiDate = this.gregorianToShamsi(this.currentMonth);
      const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
      if (!therapist.monthlyData[monthKey]) { therapist.monthlyData[monthKey] = {}; }
      if (!therapist.monthlyData[monthKey][day]) { therapist.monthlyData[monthKey][day] = {}; }
      const value = this.parseFormattedNumber(inputEl.value);
      therapist.monthlyData[monthKey][day][field] = value;
      this.updateCountRowTotals(therapist, day);
    }
  }
  
  saveCountFieldOnBlur(therapistId, day, field, inputEl) {
    this.updateCountFieldDirect(therapistId, day, field, inputEl);
    this.saveData();
    this.updateIncomeSummary();
  }
  
  updateRowTotal(therapist, day) {
    const total = this.calculateDayTotal(therapist, day);
    const totalCell = document.querySelector(`td.total-cell[data-day="${day}"]`);
    if (totalCell) {
      totalCell.textContent = this.formatNumber(total);
    }
  }
  
  updateCountRowTotals(therapist, day) {
    const typeInfo = this.therapistTypes[therapist.type];
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    const dayData = therapist.monthlyData[monthKey]?.[day] || {};
    
    const dp = dayData.dayPatients || 0;
    const ev = dayData.evaluations || 0;
    const dpt = Math.round(dp * typeInfo.dayPatientPrice);
    const evt = Math.round(ev * typeInfo.evaluationPrice);
    const total = dpt + evt;
    
    // Update calc cells
    const dptCell = document.querySelector(`td.calc-cell[data-day="${day}"][data-type="dayPatients"]`);
    const evtCell = document.querySelector(`td.calc-cell[data-day="${day}"][data-type="evaluations"]`);
    const totalCell = document.querySelector(`td.total-cell[data-day="${day}"]`);
    
    if (dptCell) dptCell.textContent = this.formatNumber(dpt);
    if (evtCell) evtCell.textContent = this.formatNumber(evt);
    if (totalCell) totalCell.textContent = this.formatNumber(total);
  }
  
  updateIncomeSummary() {
    if (!this.selectedTherapist) return;
    const income = this.calculateTherapistIncome(this.selectedTherapist);
    const totalEl = document.querySelector('.income-value.total-income');
    const therapistEl = document.querySelector('.income-value.therapist-income');
    const clinicEl = document.querySelector('.income-value.clinic-income');
    if (totalEl) totalEl.textContent = this.formatNumber(income.total);
    if (therapistEl) therapistEl.textContent = this.formatNumber(income.therapistShare);
    if (clinicEl) clinicEl.textContent = this.formatNumber(income.clinicShare);
  }

  updatePercentage(therapistId, newPercent) {
    if (!this.canEdit()) { alert('شما دسترسی به این عملیات را ندارید'); return; }
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
    return { 
      total: Math.round(total), 
      therapistShare: Math.round((total * therapist.percentage) / 100), 
      clinicShare: Math.round((total * (100 - therapist.percentage)) / 100) 
    };
  }

  getCost(therapist, day, patientIndex) {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    const val = therapist.monthlyData[monthKey]?.[day]?.[patientIndex];
    return val ? Math.round(val) : '';
  }

  getCountField(therapist, day, field) {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    const val = therapist.monthlyData[monthKey]?.[day]?.[field];
    return val ? Math.round(val) : '';
  }

  calculateDayTotal(therapist, day) {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    const dayData = therapist.monthlyData[monthKey]?.[day] || {};
    const typeInfo = this.therapistTypes[therapist.type] || this.therapistTypes['کاردرمانگر'];
    let total = 0;
    if (typeInfo.structure === 'count-based') {
      const dayPatients = dayData.dayPatients || 0;
      const evaluations = dayData.evaluations || 0;
      total = (dayPatients * typeInfo.dayPatientPrice) + (evaluations * typeInfo.evaluationPrice);
    } else {
      for (let i = 0; i < typeInfo.patients; i++) { total += dayData[i] || 0; }
    }
    return Math.round(total);
  }

  changeMonth(direction) { this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + direction, 1); this.render(); }

  addClinicCost() {
    if (!this.canEdit()) { alert('شما دسترسی به این عملیات را ندارید'); return; }
    const name = prompt('نام هزینه (مثلاً: اجاره، حقوق منشی):');
    if (!name || !name.trim()) return;
    const amount = prompt('مبلغ ماهانه (تومان):');
    if (!amount || isNaN(amount)) return;
    const categoryKeys = Object.keys(this.expenseCategories);
    const categoryLabels = categoryKeys.map((k, i) => `${i + 1}. ${this.expenseCategories[k].label}`).join('\n');
    const categoryChoice = prompt(`دسته‌بندی را انتخاب کنید:\n${categoryLabels}\n\nشماره دسته:`);
    const categoryIndex = parseInt(categoryChoice) - 1;
    const category = categoryKeys[categoryIndex] || 'other';
    const costId = Date.now().toString();
    if (!this.clinicCosts.items) { this.clinicCosts.items = {}; }
    this.clinicCosts.items[costId] = { id: costId, name: name.trim(), amount: Math.round(parseFloat(amount)), category };
    this.saveData();
    this.render();
  }

  deleteClinicCost(costId) {
    if (!this.canEdit()) { alert('شما دسترسی به این عملیات را ندارید'); return; }
    if (confirm('آیا از حذف این هزینه اطمینان دارید؟')) {
      delete this.clinicCosts.items[costId];
      this.saveData();
      this.render();
    }
  }

  getMonthlyClinicCosts() {
    if (!this.clinicCosts.items) return 0;
    return Math.round(Object.values(this.clinicCosts.items).reduce((sum, cost) => sum + cost.amount, 0));
  }

  getCostsByCategory() {
    const result = {};
    Object.keys(this.expenseCategories).forEach(cat => {
      result[cat] = { ...this.expenseCategories[cat], total: 0, items: [] };
    });
    if (this.clinicCosts.items) {
      Object.values(this.clinicCosts.items).forEach(cost => {
        const cat = cost.category || 'other';
        if (result[cat]) { result[cat].total += cost.amount; result[cat].items.push(cost); }
      });
    }
    return result;
  }

  setBudget(category, amount) {
    if (!this.canEdit()) { alert('شما دسترسی به این عملیات را ندارید'); return; }
    this.budgets[category] = Math.round(parseFloat(amount) || 0);
    this.saveData();
    this.render();
  }

  getBudgetStatus(category) {
    const budget = this.budgets[category] || 0;
    const costs = this.getCostsByCategory()[category];
    const spent = costs ? Math.round(costs.total) : 0;
    const remaining = budget - spent;
    const percentage = budget > 0 ? (spent / budget) * 100 : 0;
    let status = 'good';
    if (percentage >= 100) status = 'over';
    else if (percentage >= 80) status = 'warning';
    return { budget, spent, remaining, percentage, status };
  }

  exportToExcel() {
    if (typeof XLSX === 'undefined') {
      alert('کتابخانه اکسل بارگذاری نشده است. لطفاً صفحه را رفرش کنید.');
      return;
    }
    try {
      const shamsiDate = this.gregorianToShamsi(this.currentMonth);
      const monthName = this.monthNames[shamsiDate.month];
      const year = shamsiDate.year;
      const wb = XLSX.utils.book_new();
      
      const summaryData = [['گزارش مالی مطب'], [`${monthName} ${year}`], [''], ['نام درمانگر', 'نوع', 'کل درآمد', 'سهم درمانگر', 'سهم مطب']];
      this.therapists.forEach(t => {
        const income = this.calculateTherapistIncome(t);
        summaryData.push([t.name, t.type, income.total, income.therapistShare, income.clinicShare]);
      });
      const totalIncome = this.therapists.reduce((sum, t) => sum + this.calculateTherapistIncome(t).total, 0);
      const totalClinicShare = this.therapists.reduce((sum, t) => sum + this.calculateTherapistIncome(t).clinicShare, 0);
      const clinicCosts = this.getMonthlyClinicCosts();
      summaryData.push(['']);
      summaryData.push(['مجموع کل', '', totalIncome, '', totalClinicShare]);
      summaryData.push(['هزینه‌های مطب', '', '', '', clinicCosts]);
      summaryData.push(['درآمد خالص مطب', '', '', '', totalClinicShare - clinicCosts]);
      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'گزارش کلی');
      
      const costsData = [['هزینه‌های مطب'], [''], ['دسته‌بندی', 'نام هزینه', 'مبلغ (تومان)']];
      const costsByCategory = this.getCostsByCategory();
      Object.keys(costsByCategory).forEach(cat => {
        const catData = costsByCategory[cat];
        catData.items.forEach(item => { costsData.push([catData.label, item.name, item.amount]); });
      });
      costsData.push(['']);
      costsData.push(['مجموع هزینه‌ها', '', clinicCosts]);
      const ws2 = XLSX.utils.aoa_to_sheet(costsData);
      XLSX.utils.book_append_sheet(wb, ws2, 'هزینه‌ها');
      
      this.therapists.forEach(therapist => {
        const typeInfo = this.therapistTypes[therapist.type] || this.therapistTypes['کاردرمانگر'];
        const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
        const monthData = therapist.monthlyData[monthKey] || {};
        const daysInMonth = this.getDaysInMonth(this.currentMonth);
        const therapistData = [[`${therapist.name} - ${monthName} ${year}`], ['']];
        
        if (typeInfo.structure === 'count-based') {
          therapistData.push(['روز', 'تعداد بیماران', 'مبلغ بیماران', 'تعداد ارزیابی', 'مبلغ ارزیابی', 'جمع روزانه']);
          for (let d = 1; d <= daysInMonth; d++) {
            const dayData = monthData[d] || {};
            const dp = dayData.dayPatients || 0;
            const ev = dayData.evaluations || 0;
            therapistData.push([d, dp, dp * typeInfo.dayPatientPrice, ev, ev * typeInfo.evaluationPrice, (dp * typeInfo.dayPatientPrice) + (ev * typeInfo.evaluationPrice)]);
          }
        } else {
          const headers = ['روز'];
          for (let p = typeInfo.patients; p >= 1; p--) headers.push(`بیمار ${p}`);
          headers.push('جمع روزانه');
          therapistData.push(headers);
          for (let d = 1; d <= daysInMonth; d++) {
            const row = [d];
            const dayData = monthData[d] || {};
            for (let p = typeInfo.patients - 1; p >= 0; p--) { row.push(dayData[p] || 0); }
            row.push(this.calculateDayTotal(therapist, d));
            therapistData.push(row);
          }
        }
        const income = this.calculateTherapistIncome(therapist);
        therapistData.push(['']);
        therapistData.push(['کل درآمد', income.total]);
        therapistData.push([`سهم درمانگر (${therapist.percentage}%)`, income.therapistShare]);
        therapistData.push(['سهم مطب', income.clinicShare]);
        const ws = XLSX.utils.aoa_to_sheet(therapistData);
        XLSX.utils.book_append_sheet(wb, ws, therapist.name.substring(0, 31));
      });
      
      XLSX.writeFile(wb, `گزارش_مطب_${monthName}_${year}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
      alert('خطا در ایجاد فایل اکسل: ' + error.message);
    }
  }

  printReport() {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthName = this.monthNames[shamsiDate.month];
    const year = shamsiDate.year;
    const totalIncome = this.therapists.reduce((sum, t) => sum + this.calculateTherapistIncome(t).total, 0);
    const totalClinicShare = this.therapists.reduce((sum, t) => sum + this.calculateTherapistIncome(t).clinicShare, 0);
    const clinicCosts = this.getMonthlyClinicCosts();
    const netIncome = totalClinicShare - clinicCosts;
    const costsByCategory = this.getCostsByCategory();
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>گزارش مالی - ${monthName} ${year}</title>
<style>@font-face{font-family:'Vazir';src:url('Vazir.ttf') format('truetype');}*{margin:0;padding:0;box-sizing:border-box;font-family:'Vazir',Tahoma,sans-serif;}body{padding:20px;font-size:12px;line-height:1.6;}.header{text-align:center;border-bottom:3px double #333;padding-bottom:15px;margin-bottom:20px;}.header h1{font-size:20px;margin-bottom:5px;}.header .date{font-size:14px;color:#666;}.section{margin-bottom:25px;page-break-inside:avoid;}.section-title{font-size:14px;font-weight:bold;background:#f0f0f0;padding:8px 12px;margin-bottom:10px;border-right:4px solid #333;}table{width:100%;border-collapse:collapse;margin-bottom:15px;}th,td{border:1px solid #ddd;padding:8px;text-align:center;}th{background:#f5f5f5;font-weight:bold;}.total-row{background:#e8f5e9;font-weight:bold;}.expense-row{background:#ffebee;}.net-row{background:#e3f2fd;font-weight:bold;font-size:14px;}.summary-box{display:flex;justify-content:space-around;margin:20px 0;flex-wrap:wrap;}.summary-item{text-align:center;padding:15px;border:2px solid #ddd;border-radius:8px;min-width:150px;margin:5px;}.summary-item .label{font-size:11px;color:#666;margin-bottom:5px;}.summary-item .value{font-size:18px;font-weight:bold;}.footer{text-align:center;margin-top:30px;padding-top:15px;border-top:1px solid #ddd;font-size:10px;color:#666;}.signature-area{display:flex;justify-content:space-around;margin-top:40px;}.signature-box{text-align:center;width:200px;}.signature-line{border-top:1px solid #333;margin-top:50px;padding-top:5px;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style></head><body>
<div class="header"><h1>گزارش مالی کلینیک</h1><div class="date">${monthName} ${year}</div></div>
<div class="summary-box"><div class="summary-item"><div class="label">کل درآمد</div><div class="value">${this.formatNumber(totalIncome)}</div><div class="label">تومان</div></div><div class="summary-item"><div class="label">سهم مطب</div><div class="value">${this.formatNumber(totalClinicShare)}</div><div class="label">تومان</div></div><div class="summary-item"><div class="label">هزینه‌ها</div><div class="value" style="color:#c00;">${this.formatNumber(clinicCosts)}</div><div class="label">تومان</div></div><div class="summary-item" style="border-color:#4caf50;"><div class="label">درآمد خالص</div><div class="value" style="color:${netIncome >= 0 ? '#2e7d32' : '#c00'};">${this.formatNumber(netIncome)}</div><div class="label">تومان</div></div></div>
<div class="section"><div class="section-title">درآمد درمانگران</div><table><thead><tr><th>نام درمانگر</th><th>نوع</th><th>سهم (%)</th><th>کل درآمد</th><th>سهم درمانگر</th><th>سهم مطب</th></tr></thead><tbody>${this.therapists.map(t => {const i = this.calculateTherapistIncome(t); return `<tr><td>${t.name}</td><td>${t.type}</td><td>${t.percentage}%</td><td>${this.formatNumber(i.total)}</td><td>${this.formatNumber(i.therapistShare)}</td><td>${this.formatNumber(i.clinicShare)}</td></tr>`;}).join('')}<tr class="total-row"><td colspan="3">مجموع</td><td>${this.formatNumber(totalIncome)}</td><td>${this.formatNumber(totalIncome - totalClinicShare)}</td><td>${this.formatNumber(totalClinicShare)}</td></tr></tbody></table></div>
<div class="section"><div class="section-title">هزینه‌های مطب</div><table><thead><tr><th>دسته‌بندی</th><th>شرح هزینه</th><th>مبلغ (تومان)</th></tr></thead><tbody>${Object.keys(costsByCategory).map(cat => {const catData = costsByCategory[cat]; return catData.items.map(item => `<tr><td>${catData.label}</td><td>${item.name}</td><td>${this.formatNumber(item.amount)}</td></tr>`).join('');}).join('')}<tr class="expense-row"><td colspan="2">مجموع هزینه‌ها</td><td>${this.formatNumber(clinicCosts)}</td></tr></tbody></table></div>
<div class="section"><table><tr class="net-row"><td style="width:70%;">درآمد خالص مطب (سهم مطب - هزینه‌ها)</td><td style="color:${netIncome >= 0 ? '#2e7d32' : '#c00'};">${this.formatNumber(netIncome)} تومان</td></tr></table></div>
<div class="signature-area"><div class="signature-box"><div class="signature-line">امضای مدیر</div></div><div class="signature-box"><div class="signature-line">امضای حسابدار</div></div></div>
<div class="footer">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')} | سیستم حسابداری کلینیک</div></body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }

  printTherapistReport(therapistId) {
    const therapist = this.therapists.find(t => t.id === therapistId);
    if (!therapist) return;
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthName = this.monthNames[shamsiDate.month];
    const year = shamsiDate.year;
    const income = this.calculateTherapistIncome(therapist);
    const typeInfo = this.therapistTypes[therapist.type] || this.therapistTypes['کاردرمانگر'];
    const monthKey = `${shamsiDate.year}-${shamsiDate.month + 1}`;
    const monthData = therapist.monthlyData[monthKey] || {};
    const daysInMonth = this.getDaysInMonth(this.currentMonth);
    
    let tableHTML = '';
    if (typeInfo.structure === 'count-based') {
      tableHTML = `<table><thead><tr><th>روز</th><th>تعداد بیماران</th><th>مبلغ بیماران</th><th>تعداد ارزیابی</th><th>مبلغ ارزیابی</th><th>جمع روزانه</th></tr></thead><tbody>${Array.from({length: daysInMonth}, (_, i) => {const d = i + 1; const dayData = monthData[d] || {}; const dp = dayData.dayPatients || 0; const ev = dayData.evaluations || 0; const dpt = dp * typeInfo.dayPatientPrice; const evt = ev * typeInfo.evaluationPrice; const total = dpt + evt; if (dp === 0 && ev === 0) return ''; return `<tr><td>${d}</td><td>${dp}</td><td>${this.formatNumber(dpt)}</td><td>${ev}</td><td>${this.formatNumber(evt)}</td><td>${this.formatNumber(total)}</td></tr>`;}).join('')}</tbody></table>`;
    } else {
      const headers = Array.from({length: typeInfo.patients}, (_, i) => `<th>بیمار ${typeInfo.patients - i}</th>`).join('');
      tableHTML = `<table><thead><tr><th>روز</th>${headers}<th>جمع روزانه</th></tr></thead><tbody>${Array.from({length: daysInMonth}, (_, i) => {const d = i + 1; const dayData = monthData[d] || {}; const dayTotal = this.calculateDayTotal(therapist, d); if (dayTotal === 0) return ''; const cells = Array.from({length: typeInfo.patients}, (_, j) => {const val = dayData[typeInfo.patients - 1 - j] || 0; return `<td>${val > 0 ? this.formatNumber(val) : '-'}</td>`;}).join(''); return `<tr><td>${d}</td>${cells}<td>${this.formatNumber(dayTotal)}</td></tr>`;}).join('')}</tbody></table>`;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><title>گزارش ${therapist.name} - ${monthName} ${year}</title>
<style>@font-face{font-family:'Vazir';src:url('Vazir.ttf') format('truetype');}*{margin:0;padding:0;box-sizing:border-box;font-family:'Vazir',Tahoma,sans-serif;}body{padding:20px;font-size:11px;line-height:1.5;}.header{text-align:center;border-bottom:3px double #333;padding-bottom:15px;margin-bottom:20px;}.header h1{font-size:18px;margin-bottom:5px;}.header .subtitle{font-size:14px;color:#333;margin-bottom:5px;}.header .date{font-size:12px;color:#666;}table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10px;}th,td{border:1px solid #ddd;padding:5px;text-align:center;}th{background:#f5f5f5;font-weight:bold;}.summary{background:#f0f8ff;padding:15px;border-radius:8px;margin-top:20px;}.summary-grid{display:flex;justify-content:space-around;}.summary-item{text-align:center;}.summary-item .label{font-size:11px;color:#666;}.summary-item .value{font-size:16px;font-weight:bold;margin:5px 0;}.footer{text-align:center;margin-top:30px;font-size:10px;color:#666;}.signature{margin-top:40px;display:flex;justify-content:space-around;}.signature-box{text-align:center;}.signature-line{border-top:1px solid #333;width:150px;margin-top:40px;padding-top:5px;}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}</style></head><body>
<div class="header"><h1>گزارش درآمد درمانگر</h1><div class="subtitle">${therapist.name} - ${therapist.type}</div><div class="date">${monthName} ${year}</div></div>
${tableHTML}
<div class="summary"><div class="summary-grid"><div class="summary-item"><div class="label">کل درآمد ماه</div><div class="value">${this.formatNumber(income.total)}</div><div class="label">تومان</div></div><div class="summary-item"><div class="label">سهم درمانگر (${therapist.percentage}%)</div><div class="value" style="color:#2e7d32;">${this.formatNumber(income.therapistShare)}</div><div class="label">تومان</div></div><div class="summary-item"><div class="label">سهم مطب</div><div class="value" style="color:#1565c0;">${this.formatNumber(income.clinicShare)}</div><div class="label">تومان</div></div></div></div>
<div class="signature"><div class="signature-box"><div class="signature-line">امضای درمانگر</div></div><div class="signature-box"><div class="signature-line">امضای مدیر</div></div></div>
<div class="footer">تاریخ چاپ: ${new Date().toLocaleDateString('fa-IR')}</div></body></html>`);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  }

  toggleAddTherapist() { if (!this.canEdit()) { alert('شما دسترسی به این عملیات را ندارید'); return; } this.showAddTherapist = !this.showAddTherapist; this.render(); }
  toggleSummary() { this.showSummary = !this.showSummary; this.render(); }
  toggleCosts() { this.showCosts = !this.showCosts; this.render(); }
  toggleCharts() { this.showCharts = !this.showCharts; this.render(); }
  toggleExport() { this.showExport = !this.showExport; this.render(); }

  getClinicRawIncome() {
    const totalIncome = this.therapists.reduce((sum, t) => sum + this.calculateTherapistIncome(t).clinicShare, 0);
    return Math.round(totalIncome - this.getMonthlyClinicCosts());
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
          Object.values(monthData).forEach(day => { total += ((day.dayPatients || 0) * typeInfo.dayPatientPrice) + ((day.evaluations || 0) * typeInfo.evaluationPrice); });
        } else {
          Object.values(monthData).forEach(day => { for (let j = 0; j < typeInfo.patients; j++) { total += day[j] || 0; } });
        }
        const therapistShare = Math.round((total * therapist.percentage) / 100);
        const clinicShare = Math.round((total * (100 - therapist.percentage)) / 100);
        data[monthKey].therapists[therapist.id] = { name: therapist.name, income: therapistShare };
        data[monthKey].clinicRaw += clinicShare;
      });
      data[monthKey].clinicRaw = Math.round(data[monthKey].clinicRaw - this.getMonthlyClinicCosts());
    }
    return data;
  }

  submitTherapist() { const name = document.getElementById('therapist-name').value; const percent = document.getElementById('therapist-percent').value; this.addTherapist(name, percent); }
  selectTherapist(id) { this.selectedTherapist = this.therapists.find(t => t.id === id); this.render(); }
  
  importExcel(therapistId) {
    if (!this.canAddSalary()) { alert('شما دسترسی به این عملیات را ندارید'); return; }
    this.currentImportTherapistId = therapistId;
    document.getElementById('excel-file-input').click();
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
        const monthIndex = this.monthNames.indexOf(parts[0]);
        if (monthIndex === -1) return;
        const year = parts[1] ? parseInt(parts[1]) : 1403;
        const monthKey = `${year}-${monthIndex + 1}`;
        if (!therapist.monthlyData[monthKey]) { therapist.monthlyData[monthKey] = {}; }
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row[0] || isNaN(row[0])) continue;
          const day = row[0];
          if (!therapist.monthlyData[monthKey][day]) { therapist.monthlyData[monthKey][day] = {}; }
          if (typeInfo.structure === 'count-based') {
            if (row[1] && !isNaN(row[1])) therapist.monthlyData[monthKey][day].dayPatients = Math.round(parseFloat(row[1]));
            if (row[3] && !isNaN(row[3])) therapist.monthlyData[monthKey][day].evaluations = Math.round(parseFloat(row[3]));
          } else {
            for (let p = 0; p < typeInfo.patients; p++) {
              if (row[p + 1] && !isNaN(row[p + 1])) therapist.monthlyData[monthKey][day][p] = Math.round(parseFloat(row[p + 1]));
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
      alert('خطا در خواندن فایل اکسل');
    }
  }

  // FIXED NAVIGATION - Using global keyboard listener
  setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      const activeEl = document.activeElement;
      if (!activeEl || !activeEl.classList.contains('cost-input')) return;
      
      const key = e.key;
      if (!['Enter', 'ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp', 'Tab'].includes(key)) return;
      if (key === 'Tab') return; // Let Tab work normally
      
      e.preventDefault();
      
      const day = parseInt(activeEl.dataset.day);
      const patient = activeEl.dataset.patient !== undefined ? parseInt(activeEl.dataset.patient) : null;
      const field = activeEl.dataset.field;
      const daysInMonth = this.getDaysInMonth(this.currentMonth);
      
      if (patient !== null) {
        // Patient-based table
        const therapist = this.selectedTherapist;
        const typeInfo = this.therapistTypes[therapist.type];
        const patientsCount = typeInfo.patients;
        
        let targetDay = day;
        let targetPatient = patient;
        
        if (key === 'Enter' || key === 'ArrowDown') {
          targetDay = day < daysInMonth ? day + 1 : 1;
        } else if (key === 'ArrowUp') {
          targetDay = day > 1 ? day - 1 : daysInMonth;
        } else if (key === 'ArrowRight') {
          targetPatient = patient > 0 ? patient - 1 : patientsCount - 1;
        } else if (key === 'ArrowLeft') {
          targetPatient = patient < patientsCount - 1 ? patient + 1 : 0;
        }
        
        const nextInput = document.querySelector(`input.cost-input[data-day="${targetDay}"][data-patient="${targetPatient}"]`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      } else if (field) {
        // Count-based table
        let targetDay = day;
        let targetField = field;
        
        if (key === 'Enter' || key === 'ArrowDown') {
          targetDay = day < daysInMonth ? day + 1 : 1;
        } else if (key === 'ArrowUp') {
          targetDay = day > 1 ? day - 1 : daysInMonth;
        } else if (key === 'ArrowRight' && field === 'dayPatients') {
          targetField = 'evaluations';
        } else if (key === 'ArrowLeft' && field === 'evaluations') {
          targetField = 'dayPatients';
        }
        
        const nextInput = document.querySelector(`input.cost-input[data-day="${targetDay}"][data-field="${targetField}"]`);
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
        }
      }
    });
  }

  renderMonthSelector() {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const currentYear = shamsiDate.year;
    const currentMonth = shamsiDate.month;
    
    const years = [];
    for (let y = currentYear - 2; y <= currentYear + 1; y++) {
      years.push(y);
    }
    
    return `<div class="month-selector">
      <select id="header-month-select" class="month-select" onchange="app.onMonthSelectChange()">
        ${this.monthNames.map((name, idx) => `<option value="${idx}" ${idx === currentMonth ? 'selected' : ''}>${name}</option>`).join('')}
      </select>
      <select id="header-year-select" class="year-select" onchange="app.onMonthSelectChange()">
        ${years.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('')}
      </select>
      <div class="month-nav-btns">
        <button class="btn-nav" onclick="app.changeMonth(-1)"><span class="material-icons">chevron_right</span></button>
        <button class="btn-nav" onclick="app.changeMonth(1)"><span class="material-icons">chevron_left</span></button>
      </div>
    </div>`;
  }

  onMonthSelectChange() {
    const monthSelect = document.getElementById('header-month-select');
    const yearSelect = document.getElementById('header-year-select');
    if (monthSelect && yearSelect) {
      const month = parseInt(monthSelect.value);
      const year = parseInt(yearSelect.value);
      this.setMonth(year, month);
    }
  }

  render() {
    const app = document.getElementById('app');
    if (this.showLogin) { app.innerHTML = this.renderLoginPage(); return; }
    
    app.innerHTML = `<div class="container">
      <div class="header">
        <div class="header-right">
          ${this.renderMonthSelector()}
        </div>
        <h1>سیستم حسابداری درمانگران</h1>
        <div class="header-left">
          <div class="user-info"><span class="material-icons" style="font-size: 20px; color: #3182ce;">account_circle</span><span>${this.currentUser.name}</span><span class="role-badge ${this.currentUser.role}">${this.currentUser.role === 'admin' ? 'مدیر' : 'منشی'}</span></div>
          <button class="btn btn-logout" onclick="app.logout()"><span class="material-icons" style="font-size: 16px;">logout</span>خروج</button>
          <div id="save-status" class="save-status" style="display: none;"><span class="material-icons" style="font-size: 18px;">save</span><span></span></div>
        </div>
      </div>
      <div class="button-group">
        ${this.canEdit() ? `<button class="btn btn-primary" onclick="app.toggleAddTherapist()"><span class="material-icons" style="font-size: 18px;">person_add</span>افزودن درمانگر</button>` : ''}
        <button class="btn btn-success" onclick="app.toggleSummary()"><span class="material-icons" style="font-size: 18px;">${this.showSummary ? 'visibility_off' : 'visibility'}</span>${this.showSummary ? 'مخفی کردن گزارش' : 'نمایش گزارش کلی'}</button>
        <button class="btn btn-primary" onclick="app.toggleCosts()"><span class="material-icons" style="font-size: 18px;">payments</span>${this.showCosts ? 'مخفی کردن' : 'هزینه‌ها و بودجه'}</button>
        <button class="btn btn-success" onclick="app.toggleCharts()"><span class="material-icons" style="font-size: 18px;">show_chart</span>${this.showCharts ? 'مخفی کردن نمودار' : 'نمایش نمودار درآمد'}</button>
        <button class="btn btn-export" onclick="app.toggleExport()"><span class="material-icons" style="font-size: 18px;">download</span>${this.showExport ? 'مخفی کردن خروجی' : 'خروجی و چاپ'}</button>
      </div>
      ${this.showAddTherapist ? this.renderAddTherapistForm() : ''}
      ${this.showExport ? this.renderExportSection() : ''}
      ${this.showCosts ? this.renderCostsAndBudget() : ''}
      ${this.showSummary ? this.renderSummary() : ''}
      ${this.showCharts ? this.renderCharts() : ''}
      ${this.renderTherapistGrid()}
      ${this.selectedTherapist ? this.renderTable() : ''}
    </div>`;
    
    // Setup keyboard navigation after render
    this.setupKeyboardNavigation();
  }

  renderLoginPage() {
    return `<div class="login-container"><div class="login-box">
      <div class="login-header"><span class="material-icons login-icon">local_hospital</span><h1>سیستم حسابداری کلینیک</h1><p>لطفاً وارد حساب کاربری خود شوید</p></div>
      <div class="login-form">
        <div class="input-group"><span class="material-icons">person</span><input type="text" id="login-username" class="login-input" placeholder="نام کاربری"></div>
        <div class="input-group"><span class="material-icons">lock</span><input type="password" id="login-password" class="login-input" placeholder="رمز عبور" onkeypress="if(event.key==='Enter')app.handleLogin()"></div>
        <button class="btn btn-login" onclick="app.handleLogin()"><span class="material-icons">login</span>ورود به سیستم</button>
      </div>
      <div class="login-footer"><div class="demo-accounts"><p style="margin-bottom: 10px; color: #718096; font-size: 13px;">حساب‌های آزمایشی:</p><div class="demo-account"><strong>مدیر:</strong> admin / admin123</div><div class="demo-account"><strong>منشی:</strong> secretary / sec123</div></div></div>
    </div></div>`;
  }

  handleLogin() { this.login(document.getElementById('login-username').value, document.getElementById('login-password').value); }

  renderExportSection() {
    const shamsiDate = this.gregorianToShamsi(this.currentMonth);
    const monthName = this.monthNames[shamsiDate.month];
    const year = shamsiDate.year;
    return `<div class="section-box export-section"><div class="section-header"><span class="material-icons">download</span><h3>خروجی و چاپ گزارشات</h3></div><p class="section-subtitle">گزارش ${monthName} ${year}</p>
      <div class="export-grid">
        <div class="export-card" onclick="app.exportToExcel()"><span class="material-icons export-icon" style="color:#38a169;">table_chart</span><div class="export-title">خروجی اکسل</div><div class="export-desc">دانلود گزارش کامل در فرمت XLSX</div></div>
        <div class="export-card" onclick="app.printReport()"><span class="material-icons export-icon" style="color:#e53e3e;">picture_as_pdf</span><div class="export-title">چاپ گزارش کلی</div><div class="export-desc">چاپ گزارش مالی مطب</div></div>
        ${this.selectedTherapist ? `<div class="export-card" onclick="app.printTherapistReport(${this.selectedTherapist.id})"><span class="material-icons export-icon" style="color:#3182ce;">person</span><div class="export-title">چاپ گزارش ${this.selectedTherapist.name}</div><div class="export-desc">چاپ کارنامه درمانگر انتخاب شده</div></div>` : ''}
      </div>
    </div>`;
  }

  renderCostsAndBudget() {
    const costsByCategory = this.getCostsByCategory();
    const totalCosts = this.getMonthlyClinicCosts();
    
    return `<div class="section-box costs-budget-section">
      <div class="section-header">
        <span class="material-icons">account_balance_wallet</span>
        <h3>مدیریت هزینه‌ها و بودجه</h3>
        ${this.canEdit() ? `<button class="btn btn-primary btn-sm" onclick="app.addClinicCost()"><span class="material-icons" style="font-size: 16px;">add</span>افزودن هزینه</button>` : ''}
      </div>
      
      <div class="costs-budget-grid">
        ${Object.keys(this.expenseCategories).map(cat => {
          const catInfo = this.expenseCategories[cat];
          const catData = costsByCategory[cat];
          const budgetStatus = this.getBudgetStatus(cat);
          const statusClass = budgetStatus.status === 'over' ? 'status-over' : budgetStatus.status === 'warning' ? 'status-warning' : 'status-good';
          
          return `<div class="category-card ${statusClass}">
            <div class="category-header" style="border-right-color: ${catInfo.color};">
              <span class="material-icons" style="color: ${catInfo.color};">${catInfo.icon}</span>
              <span class="category-title">${catInfo.label}</span>
              <span class="category-spent" style="color: ${catInfo.color};">${this.formatNumber(catData.total)} ت</span>
            </div>
            
            ${this.canEdit() ? `<div class="budget-row">
              <span>سقف بودجه:</span>
              <input type="text" class="budget-input" value="${this.formatNumber(budgetStatus.budget)}" onchange="app.setBudget('${cat}', app.parseFormattedNumber(this.value))" placeholder="0">
              <span>تومان</span>
            </div>` : ''}
            
            ${budgetStatus.budget > 0 ? `<div class="progress-container">
              <div class="progress-bar"><div class="progress-fill ${statusClass}" style="width: ${Math.min(budgetStatus.percentage, 100)}%"></div></div>
              <div class="progress-info"><span>${Math.round(budgetStatus.percentage)}% مصرف شده</span>${budgetStatus.status !== 'good' ? `<span class="alert-badge ${statusClass}">${budgetStatus.status === 'over' ? 'بیش از حد!' : 'هشدار'}</span>` : ''}</div>
            </div>` : ''}
            
            ${catData.items.length > 0 ? `<div class="category-items">
              ${catData.items.map(item => `<div class="cost-item">
                <span class="cost-name">${item.name}</span>
                <span class="cost-amount">${this.formatNumber(item.amount)} ت</span>
                ${this.canEdit() ? `<button class="btn-icon btn-delete" onclick="app.deleteClinicCost('${item.id}')"><span class="material-icons">close</span></button>` : ''}
              </div>`).join('')}
            </div>` : '<div class="no-items">بدون هزینه</div>'}
          </div>`;
        }).join('')}
      </div>
      
      <div class="costs-total-bar">
        <span>مجموع کل هزینه‌های ماهانه:</span>
        <span class="total-amount">${this.formatNumber(totalCosts)} تومان</span>
      </div>
    </div>`;
  }

  renderAddTherapistForm() {
    return `<div class="section-box"><div class="section-header"><span class="material-icons">person_add</span><h3>افزودن درمانگر جدید</h3></div><div class="form-row"><input type="text" id="therapist-name" class="input" placeholder="نام درمانگر" style="flex: 1;"><select id="therapist-type" class="input" style="width: 150px;"><option value="کاردرمانگر">کاردرمانگر</option><option value="گفتاردرمان">گفتاردرمان</option></select><div class="input-with-icon"><input type="number" id="therapist-percent" class="input" value="50" min="0" max="100" style="width: 80px;"><span>%</span></div><button class="btn btn-primary" onclick="app.submitTherapist()">افزودن</button></div></div>`;
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
    const chartHeight = 200;
    const chartWidth = 600;
    const padding = 40;
    
    let therapistCharts = '';
    this.therapists.forEach(therapist => {
      const data = months.map(m => historicalData[m].therapists[therapist.id]?.income || 0);
      const maxValue = Math.max(...data, 1);
      const minValue = Math.min(...data, 0);
      const range = maxValue - minValue || 1;
      
      const points = data.map((value, idx) => {
        const x = padding + (idx * (chartWidth - 2 * padding) / (data.length - 1 || 1));
        const y = chartHeight - padding - ((value - minValue) / range * (chartHeight - 2 * padding));
        return { x, y, value };
      });
      
      const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      
      therapistCharts += `<div class="chart-card">
        <h4>${therapist.name}</h4>
        <div class="chart-container">
          <svg viewBox="0 0 ${chartWidth} ${chartHeight + 40}" class="line-chart">
            ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
              const y = chartHeight - padding - (ratio * (chartHeight - 2 * padding));
              const val = Math.round(minValue + ratio * range);
              return `<line x1="${padding}" y1="${y}" x2="${chartWidth - padding}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>
                      <text x="${padding - 5}" y="${y + 4}" text-anchor="end" fill="#718096" font-size="10">${this.formatNumber(val)}</text>`;
            }).join('')}
            <path d="${pathD}" fill="none" stroke="#48bb78" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            ${points.map((p, idx) => `
              <circle cx="${p.x}" cy="${p.y}" r="6" fill="#48bb78" stroke="white" stroke-width="2"/>
              <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" fill="#38a169" font-size="11" font-weight="bold">${this.formatNumber(p.value)}</text>
              <text x="${p.x}" y="${chartHeight + 15}" text-anchor="middle" fill="#718096" font-size="10">${labels[idx].split(' ')[0]}</text>
            `).join('')}
          </svg>
        </div>
      </div>`;
    });
    
    const clinicData = months.map(m => historicalData[m].clinicRaw);
    const clinicMax = Math.max(...clinicData, 0);
    const clinicMin = Math.min(...clinicData, 0);
    const clinicRange = clinicMax - clinicMin || 1;
    
    const clinicPoints = clinicData.map((value, idx) => {
      const x = padding + (idx * (chartWidth - 2 * padding) / (clinicData.length - 1 || 1));
      const y = chartHeight - padding - ((value - clinicMin) / clinicRange * (chartHeight - 2 * padding));
      return { x, y, value };
    });
    
    const clinicPathD = clinicPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    
    const clinicChart = `<div class="chart-card">
      <h4>درآمد خالص مطب</h4>
      <div class="chart-container">
        <svg viewBox="0 0 ${chartWidth} ${chartHeight + 40}" class="line-chart">
          ${clinicMin < 0 ? `<line x1="${padding}" y1="${chartHeight - padding - ((0 - clinicMin) / clinicRange * (chartHeight - 2 * padding))}" x2="${chartWidth - padding}" y2="${chartHeight - padding - ((0 - clinicMin) / clinicRange * (chartHeight - 2 * padding))}" stroke="#e53e3e" stroke-width="1" stroke-dasharray="5,5"/>` : ''}
          ${[0, 0.25, 0.5, 0.75, 1].map(ratio => {
            const y = chartHeight - padding - (ratio * (chartHeight - 2 * padding));
            const val = Math.round(clinicMin + ratio * clinicRange);
            return `<line x1="${padding}" y1="${y}" x2="${chartWidth - padding}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>
                    <text x="${padding - 5}" y="${y + 4}" text-anchor="end" fill="#718096" font-size="10">${this.formatNumber(val)}</text>`;
          }).join('')}
          <path d="${clinicPathD}" fill="none" stroke="#3182ce" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          ${clinicPoints.map((p, idx) => `
            <circle cx="${p.x}" cy="${p.y}" r="6" fill="${p.value >= 0 ? '#3182ce' : '#e53e3e'}" stroke="white" stroke-width="2"/>
            <text x="${p.x}" y="${p.y - 12}" text-anchor="middle" fill="${p.value >= 0 ? '#3182ce' : '#e53e3e'}" font-size="11" font-weight="bold">${this.formatNumber(p.value)}</text>
            <text x="${p.x}" y="${chartHeight + 15}" text-anchor="middle" fill="#718096" font-size="10">${labels[idx].split(' ')[0]}</text>
          `).join('')}
        </svg>
      </div>
    </div>`;
    
    return `<div class="charts-section">
      <h3><span class="material-icons">show_chart</span>نمودار درآمد 6 ماه اخیر</h3>
      <div class="charts-grid">
        ${therapistCharts}
        ${clinicChart}
      </div>
    </div>`;
  }

  renderTherapistGrid() {
    return `<div class="therapist-grid">${this.therapists.map(t => {const i = this.calculateTherapistIncome(t); const a = this.selectedTherapist?.id === t.id; const ti = this.therapistTypes[t.type] || this.therapistTypes['گفتاردرمان']; return `<div class="therapist-card ${a ? 'active' : ''}" onclick="app.selectTherapist(${t.id})"><div class="therapist-header"><div style="display: flex; align-items: center; gap: 10px;"><span class="material-icons" style="font-size: 28px; color: #3182ce;">account_circle</span><div><strong style="font-size: 1.1rem;">${t.name}</strong><div style="font-size: 12px; color: #718096; margin-top: 2px;">${ti.label}</div></div></div><div style="display: flex; gap: 8px;">${this.canAddSalary() ? `<button class="btn btn-success btn-sm" onclick="event.stopPropagation(); app.importExcel(${t.id})"><span class="material-icons" style="font-size: 16px;">upload_file</span></button>` : ''}${this.canEdit() ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation(); app.deleteTherapist(${t.id})"><span class="material-icons" style="font-size: 16px;">delete</span></button>` : ''}</div></div><div class="therapist-info"><div style="font-size: 14px; display: flex; align-items: center; gap: 6px;"><span class="material-icons" style="font-size: 16px; color: #718096;">percent</span><span>سهم: ${t.percentage}٪</span></div><div style="font-size: 14px; display: flex; align-items: center; gap: 6px;"><span class="material-icons" style="font-size: 16px; color: #718096;">account_balance_wallet</span><span>درآمد: ${this.formatNumber(i.therapistShare)} تومان</span></div></div></div>`;}).join('')}</div><input type="file" id="excel-file-input" accept=".xlsx,.xls" style="display: none;" onchange="app.handleExcelFile(event)">`;
  }

  renderTable() {
    const ti = this.therapistTypes[this.selectedTherapist.type] || this.therapistTypes['کاردرمانگر'];
    if (ti.structure === 'count-based') { return this.renderCountBasedTable(this.selectedTherapist, ti); }
    return this.renderPatientBasedTable(this.selectedTherapist, ti);
  }

  renderCountBasedTable(t, ti) {
    const i = this.calculateTherapistIncome(t);
    const sd = this.gregorianToShamsi(this.currentMonth);
    const mn = this.monthNames[sd.month];
    const y = sd.year;
    const dim = this.getDaysInMonth(this.currentMonth);
    const canEditPct = this.canEdit();
    const canAdd = this.canAddSalary();
    return `<div class="table-section"><div class="table-header"><h2>${t.name} - ${ti.label}</h2><div style="display: flex; gap: 10px; align-items: center;"><button class="btn btn-print" onclick="app.printTherapistReport(${t.id})"><span class="material-icons" style="font-size: 16px;">print</span>چاپ</button><div class="percentage-control"><label>سهم:</label><input type="number" value="${t.percentage}" min="0" max="100" class="input" style="width: 70px;" ${canEditPct ? `onchange="app.updatePercentage(${t.id}, this.value)"` : 'disabled'}><span>%</span></div></div></div><div class="month-navigation"><button class="btn btn-primary" onclick="app.changeMonth(-1)"><span class="material-icons">chevron_right</span>ماه قبل</button><div class="month-display"><span class="material-icons" style="color: #3182ce;">calendar_today</span><span>${mn} ${y}</span></div><button class="btn btn-primary" onclick="app.changeMonth(1)">ماه بعد<span class="material-icons">chevron_left</span></button></div><div class="table-container"><table><thead><tr><th>روز</th><th>تعداد بیماران</th><th>مبلغ (${ti.dayPatientPrice})</th><th>تعداد ارزیابی</th><th>مبلغ (${ti.evaluationPrice})</th><th>جمع</th></tr></thead><tbody>${Array.from({length: dim}, (_, idx) => {const d = idx + 1; const dp = this.getCountField(t, d, 'dayPatients'); const ev = this.getCountField(t, d, 'evaluations'); const dpt = Math.round((dp || 0) * ti.dayPatientPrice); const evt = Math.round((ev || 0) * ti.evaluationPrice); const dt = this.calculateDayTotal(t, d); return `<tr><td class="day-cell">${d}</td><td><input type="text" class="cost-input" value="${this.formatNumber(dp)}" placeholder="0" data-day="${d}" data-field="dayPatients" ${canAdd ? `oninput="app.updateCountFieldDirect(${t.id}, ${d}, 'dayPatients', this)" onblur="app.saveCountFieldOnBlur(${t.id}, ${d}, 'dayPatients', this)"` : 'disabled'}></td><td class="calc-cell" data-day="${d}" data-type="dayPatients">${this.formatNumber(dpt)}</td><td><input type="text" class="cost-input" value="${this.formatNumber(ev)}" placeholder="0" data-day="${d}" data-field="evaluations" ${canAdd ? `oninput="app.updateCountFieldDirect(${t.id}, ${d}, 'evaluations', this)" onblur="app.saveCountFieldOnBlur(${t.id}, ${d}, 'evaluations', this)"` : 'disabled'}></td><td class="calc-cell" data-day="${d}" data-type="evaluations">${this.formatNumber(evt)}</td><td class="total-cell" data-day="${d}">${this.formatNumber(dt)}</td></tr>`;}).join('')}</tbody></table></div><div class="income-summary"><div class="income-grid"><div class="income-item"><div class="income-label">کل درآمد</div><div class="income-value total-income">${this.formatNumber(i.total)}</div><div class="income-unit">تومان</div></div><div class="income-item"><div class="income-label">سهم درمانگر (${t.percentage}٪)</div><div class="income-value therapist-income" style="color: #38a169;">${this.formatNumber(i.therapistShare)}</div><div class="income-unit">تومان</div></div><div class="income-item"><div class="income-label">سهم مطب</div><div class="income-value clinic-income" style="color: #3182ce;">${this.formatNumber(i.clinicShare)}</div><div class="income-unit">تومان</div></div></div></div></div>`;
  }

  renderPatientBasedTable(t, ti) {
    const i = this.calculateTherapistIncome(t);
    const sd = this.gregorianToShamsi(this.currentMonth);
    const mn = this.monthNames[sd.month];
    const y = sd.year;
    const dim = this.getDaysInMonth(this.currentMonth);
    const pc = ti.patients;
    const canEditPct = this.canEdit();
    const canAdd = this.canAddSalary();
    return `<div class="table-section"><div class="table-header"><h2>${t.name} - ${ti.label}</h2><div style="display: flex; gap: 10px; align-items: center;"><button class="btn btn-print" onclick="app.printTherapistReport(${t.id})"><span class="material-icons" style="font-size: 16px;">print</span>چاپ</button><div class="percentage-control"><label>سهم:</label><input type="number" value="${t.percentage}" min="0" max="100" class="input" style="width: 70px;" ${canEditPct ? `onchange="app.updatePercentage(${t.id}, this.value)"` : 'disabled'}><span>%</span></div></div></div><div class="month-navigation"><button class="btn btn-primary" onclick="app.changeMonth(-1)"><span class="material-icons">chevron_right</span>ماه قبل</button><div class="month-display"><span class="material-icons" style="color: #3182ce;">calendar_today</span><span>${mn} ${y}</span></div><button class="btn btn-primary" onclick="app.changeMonth(1)">ماه بعد<span class="material-icons">chevron_left</span></button></div><div class="table-container"><table><thead><tr><th>روز</th>${Array.from({length: pc}, (_, i) => `<th>بیمار ${pc - i}</th>`).join('')}<th>جمع</th></tr></thead><tbody>${Array.from({length: dim}, (_, idx) => {const d = idx + 1; const dt = this.calculateDayTotal(t, d); return `<tr><td class="day-cell">${d}</td>${Array.from({length: pc}, (_, i) => {const j = pc - 1 - i; const c = this.getCost(t, d, j); return `<td><input type="text" class="cost-input" value="${this.formatNumber(c)}" placeholder="0" data-day="${d}" data-patient="${j}" ${canAdd ? `oninput="app.updateCostDirect(${t.id}, ${d}, ${j}, this)" onblur="app.saveCostOnBlur(${t.id}, ${d}, ${j}, this)"` : 'disabled'}></td>`;}).join('')}<td class="total-cell" data-day="${d}">${this.formatNumber(dt)}</td></tr>`;}).join('')}</tbody></table></div><div class="income-summary"><div class="income-grid"><div class="income-item"><div class="income-label">کل درآمد</div><div class="income-value total-income">${this.formatNumber(i.total)}</div><div class="income-unit">تومان</div></div><div class="income-item"><div class="income-label">سهم درمانگر (${t.percentage}٪)</div><div class="income-value therapist-income" style="color: #38a169;">${this.formatNumber(i.therapistShare)}</div><div class="income-unit">تومان</div></div><div class="income-item"><div class="income-label">سهم مطب</div><div class="income-value clinic-income" style="color: #3182ce;">${this.formatNumber(i.clinicShare)}</div><div class="income-unit">تومان</div></div></div></div></div>`;
  }
}

const app = new TherapistAccountingApp();