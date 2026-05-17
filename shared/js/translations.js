/* ==========================================================================
   ExpenseFuel Tracker — Bilingual Translations
   Plain global — no ES module exports. Include before any app JS.
   Usage: TRANSLATIONS[lang].key  |  DEFAULT_LANG
   ========================================================================== */

const DEFAULT_LANG = 'en';

const TRANSLATIONS = {

  /* ========================================================================
     ENGLISH
     ====================================================================== */
  en: {

    /* --- App Titles --- */
    fieldAppTitle: 'Expense-Fuel Tracker',
    coordAppTitle: 'ExpenseFuel — Coordinator',

    /* --- Navigation --- */
    dashboard:      'Dashboard',
    settings:       'Settings',
    addExpense:     'Add Expense',
    addFuel:        'Add Fuel',
    myEntries:      'My Entries',
    export:         'Export',
    import:         'Import',
    reviewExpenses: 'Review Expenses',
    reviewFuel:     'Review Fuel',
    back:           'Back',
    home:           'Home',

    /* --- Actions --- */
    save:         'Save',
    cancel:       'Cancel',
    edit:         'Edit',
    delete:       'Delete',
    submit:       'Submit',
    confirm:      'Confirm',
    clear:        'Clear',
    approve:      'Approve',
    flag:         'Flag',
    approveAll:   'Approve All',
    flagAll:      'Flag All',
    exportExcel:  'Export Excel',
    exportJson:   'Export JSON',
    importFile:   'Import File',
    loadSample:   'Load Sample Data',
    saveReviews:  'Save Reviews',

    /* --- Form Labels --- */
    name:               'Name',
    mobile:             'Mobile',
    project:            'Project',
    siteId:             'Site ID',
    jobCode:            'Job Code',
    category:           'Category',
    subCategory:        'Sub-Category',
    amount:             'Amount (EGP)',
    comment:            'Comment',
    coordinator:        'Coordinator',
    trackingNumber:     'Tracking Number',
    month:              'Month',
    day:                'Day',
    date:               'Date',
    startKm:            'Start KM',
    endKm:              'End KM',
    distance:           'Distance (km)',
    fuelAmount:         'Fuel Amount (EGP)',
    kartaAmount:        'Karta Amount (EGP)',
    area:               'Area',
    driver:             'Driver',
    city:               'City',
    total:              'Total',
    newFuel:            'New Fuel',
    karta:              'Karta',
    description:        'Description',
    language:           'Language',
    accountType:        'Account Type',
    defaultCoordinator: 'Default Coordinator',
    defaultProject:     'Default Project',
    defaultDriver:      'Default Driver',

    /* --- Status --- */
    pending:     'Pending',
    approved:    'Approved',
    flagged:     'Flagged',
    reviewed:    'Reviewed',
    notReviewed: 'Not Reviewed',

    /* --- Messages --- */
    settingsRequired: 'Please complete your settings before adding entries.',
    noEntries:        'No entries yet. Tap the button below to get started.',
    noImports:        'No imported reports found.',
    saveSuccess:      'Saved successfully.',
    deleteSuccess:    'Deleted successfully.',
    exportSuccess:    'Exported successfully.',
    importSuccess:    'Report imported successfully.',
    deleteConfirm:    'Are you sure you want to delete this entry? This cannot be undone.',
    clearConfirm:     'Are you sure? This will permanently delete all entries.',
    kmMismatch:       'KM mismatch: start KM must equal previous end KM.',
    zeroAmount:       'Amount must be greater than zero.',
    missingField:     'Please fill in all required fields.',
    invalidProject:   'Selected project is not valid.',
    validationIssues: 'Some entries have validation issues. Please review.',
    allApproved:      'All entries have been approved.',
    settingsSaved:    'Settings saved successfully.',
    loadedSampleData: 'Sample data loaded. You can edit or submit it.',

    /* --- Dashboard --- */
    hello:           'Hello,',
    totalExpenses:   'Total Expenses',
    totalFuel:       'Total Fuel',
    expenseEntries:  'Expense Entries',
    fuelEntries:     'Fuel Entries',
    reviewProgress:  'Review Progress',
    recentEntries:   'Recent Entries',
    quickActions:    'Quick Actions',
    importedReports: 'Imported Reports',
    totalReports:    'Total Reports',
    pendingReview:   'Pending Review',
    fullyApproved:   'Fully Approved',
    noReports:       'No Reports Yet',
    exportFinal:     'Export Final',

    /* --- Import page --- */
    importReport:      'Import Field Report',
    dropZoneLabel:     'Drag & drop Excel or JSON file here',
    or:                'or',
    browseFile:        'Browse File',
    formatsSupported:  '.xlsx (Excel) and .json files supported',
    filePreview:       'File Preview',
    confirmImport:     'Confirm Import',
    importFailed:      'Import Failed',
    tryAgain:          'Try Again',
    noExpenses:        'No expense entries in this file.',
    noFuel:            'No fuel entries in this file.',
    unsupportedFile:   'Unsupported file type. Please use an .xlsx or .json file.',

    /* --- Export / Import --- */
    exportSummary:   'Export Summary',
    expenseCount:    'Expense Entries',
    fuelCount:       'Fuel Entries',
    expenseTotal:    'Expense Total',
    fuelTotal:       'Fuel Total',
    kartaTotal:      'Karta Total',
    grandTotal:      'Grand Total',
    dateRange:       'Date Range',
    fromDate:        'From',
    toDate:          'To',
    dateRangeHint:   'Leave both empty to export all entries.',
    fieldMember:     'Field Member',
    trackingNum:     'Tracking #',
    clearAfterExport:'Clear data after export',
    exportChecklist: 'Before you export',
    approvedEntries: 'Approved Entries',
    flaggedEntries:  'Flagged Entries',
    pendingEntries:  'Pending Entries',

    /* --- Approval Footer (EN mirrors AR intentionally in the Excel sheet) --- */
    approval:           'إعتماد',         /* إعتماد */
    accountsManager:    'مدير الحسابات', /* مدير الحسابات */
    responsibleManager: 'المدير المسؤل',  /* المدير المسؤل */
  },

  /* ========================================================================
     ARABIC
     ====================================================================== */
  ar: {

    /* --- App Titles --- */
    fieldAppTitle: 'Expense-Fuel Tracker',
    coordAppTitle: 'ExpenseFuel — المنسق',                      /* المنسق  */

    /* --- Navigation --- */
    dashboard:      'الرئيسية',                            /* الرئيسية     */
    settings:       'الإعدادات',                      /* الإعدادات    */
    addExpense:     'إضافة مصروف',               /* إضافة مصروف */
    addFuel:        'إضافة وقود',                     /* إضافة وقود  */
    myEntries:      'سجلاتي',                                        /* سجلاتي       */
    export:         'تصدير',                                              /* تصدير        */
    import:         'استيراد',                                  /* استيراد      */
    reviewExpenses: 'مراجعة المصروفات', /* مراجعة المصروفات */
    reviewFuel:     'مراجعة الوقود',   /* مراجعة الوقود */
    back:           'رجوع',                                                    /* رجوع         */
    home:           'الرئيسية',                            /* الرئيسية     */

    /* --- Actions --- */
    save:         'حفظ',                                                            /* حفظ          */
    cancel:       'إلغاء',                                                /* إلغاء        */
    edit:         'تعديل',                                                /* تعديل        */
    delete:       'حذف',                                                            /* حذف          */
    submit:       'إرسال',                                                /* إرسال        */
    confirm:      'تأكيد',                                                /* تأكيد        */
    clear:        'مسح',                                                            /* مسح          */
    approve:      'اعتماد',                                          /* اعتماد       */
    flag:         'تعليم',                                                /* تعليم        */
    approveAll:   'اعتماد الكل',                 /* اعتماد الكل  */
    flagAll:      'تعليم الكل',                       /* تعليم الكل   */
    exportExcel:  'تصدير Excel',                                          /* تصدير Excel  */
    exportJson:   'تصدير JSON',                                           /* تصدير JSON   */
    importFile:   'استيراد ملف',                 /* استيراد ملف  */
    loadSample:   'تحميل بيانات تجريبية', /* تحميل بيانات تجريبية */
    saveReviews:  'حفظ المراجعات',     /* حفظ المراجعات */

    /* --- Form Labels --- */
    name:               'الاسم',                                          /* الاسم             */
    mobile:             'الجوال',                                    /* الجوال            */
    project:            'المشروع',                              /* المشروع           */
    siteId:             'رقم الموقع',                 /* رقم الموقع        */
    jobCode:            'كود العمل',                       /* كود العمل         */
    category:           'الفئة',                                          /* الفئة             */
    subCategory:        'الفئة الفرعية', /* الفئة الفرعية   */
    amount:             'المبلغ (ج.م)',                     /* المبلغ (ج.م)      */
    comment:            'ملاحظة',                                    /* ملاحظة            */
    coordinator:        'المنسق',                                    /* المنسق            */
    trackingNumber:     'رقم التتبع',                 /* رقم التتبع        */
    month:              'الشهر',                                          /* الشهر             */
    day:                'اليوم',                                          /* اليوم             */
    date:               'التاريخ',                              /* التاريخ           */
    startKm:            'كيلومتر البداية', /* كيلومتر البداية */
    endKm:              'كيلومتر النهاية', /* كيلومتر النهاية */
    distance:           'المسافة (كم)',               /* المسافة (كم)      */
    fuelAmount:         'قيمة الوقود (ج.م)', /* قيمة الوقود (ج.م) */
    kartaAmount:        'قيمة الكارتة (ج.م)', /* قيمة الكارتة (ج.م) */
    area:               'المنطقة',                              /* المنطقة           */
    driver:             'السائق',                                    /* السائق            */
    city:               'المدينة',                              /* المدينة           */
    total:              'الإجمالي',                        /* الإجمالي          */
    newFuel:            'وقود جديد',                       /* وقود جديد         */
    karta:              'كارتة',                                          /* كارتة             */
    description:        'الوصف',                                          /* الوصف             */
    language:           'اللغة',                                          /* اللغة             */
    accountType:        'نوع الحساب',                 /* نوع الحساب        */
    defaultCoordinator: 'المنسق الافتراضي', /* المنسق الافتراضي */
    defaultProject:     'المشروع الافتراضي', /* المشروع الافتراضي */
    defaultDriver:      'السائق الافتراضي',  /* السائق الافتراضي  */

    /* --- Status --- */
    pending:     'قيد المراجعة',            /* قيد المراجعة  */
    approved:    'معتمد',                                                 /* معتمد         */
    flagged:     'مُعلَّم',                                     /* مُعلَّم       */
    reviewed:    'تمت المراجعة',            /* تمت المراجعة  */
    notReviewed: 'لم تتم المراجعة', /* لم تتم المراجعة */

    /* --- Messages --- */
    settingsRequired: 'يجب إكمال الإعدادات أولاً قبل إضافة أي سجلات.',
    /* يجب إكمال الإعدادات أولاً قبل إضافة أي سجلات. */

    noEntries:        'لا توجد سجلات حتى الآن. اضغط على الزر أدناه للبدء.',
    /* لا توجد سجلات حتى الآن. اضغط على الزر أدناه للبدء. */

    noImports:        'لا توجد تقارير مستوردة.',
    /* لا توجد تقارير مستوردة. */

    saveSuccess:      'تم الحفظ بنجاح.',
    /* تم الحفظ بنجاح. */

    deleteSuccess:    'تم الحذف بنجاح.',
    /* تم الحذف بنجاح. */

    exportSuccess:    'تم التصدير بنجاح.',
    /* تم التصدير بنجاح. */

    importSuccess:    'تم استيراد التقرير بنجاح.',
    /* تم استيراد التقرير بنجاح. */

    deleteConfirm:    'هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا.',
    /* هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا. */

    clearConfirm:     'هل أنت متأكد؟ سيتم حذف جميع البيانات نهائياً.',
    /* هل أنت متأكد؟ سيتم حذف جميع البيانات نهائياً. */

    kmMismatch:       'خطأ في تسلسل الكيلومترات: يجب أن يساوي كيلومتر البداية كيلومتر نهاية السجل السابق.',
    /* خطأ في تسلسل الكيلومترات: يجب أن يساوي كيلومتر البداية كيلومتر نهاية السجل السابق. */

    zeroAmount:       'يجب أن يكون المبلغ أكبر من صفر.',
    /* يجب أن يكون المبلغ أكبر من صفر. */

    missingField:     'يرجى تعبئة جميع الحقول المطلوبة.',
    /* يرجى تعبئة جميع الحقول المطلوبة. */

    invalidProject:   'المشروع المختار غير صالح.',
    /* المشروع المختار غير صالح. */

    validationIssues: 'توجد مشكلات في بعض السجلات. يرجى المراجعة.',
    /* توجد مشكلات في بعض السجلات. يرجى المراجعة. */

    allApproved:      'تم اعتماد جميع السجلات.',
    /* تم اعتماد جميع السجلات. */

    settingsSaved:    'تم حفظ الإعدادات بنجاح.',
    /* تم حفظ الإعدادات بنجاح. */

    loadedSampleData: 'تم تحميل البيانات التجريبية. يمكنك تعديلها أو إرسالها.',
    /* تم تحميل البيانات التجريبية. يمكنك تعديلها أو إرسالها. */

    /* --- Dashboard --- */
    hello:           'مرحباً،',
    totalExpenses:   'إجمالي المصروفات',
    totalFuel:       'إجمالي الوقود',
    expenseEntries:  'سجلات المصروفات',
    fuelEntries:     'سجلات الوقود',
    reviewProgress:  'تقدم المراجعة',
    recentEntries:   'السجلات الأخيرة',
    quickActions:    'إجراءات سريعة',
    importedReports: 'التقارير المستوردة',
    totalReports:    'إجمالي التقارير',
    pendingReview:   'قيد المراجعة',
    fullyApproved:   'معتمد بالكامل',
    noReports:       'لا توجد تقارير',
    exportFinal:     'تصدير نهائي',

    /* --- Import page --- */
    importReport:     'استيراد تقرير ميداني',
    dropZoneLabel:    'اسحب وأفلت ملف Excel أو JSON هنا',
    or:               'أو',
    browseFile:       'استعراض ملف',
    formatsSupported: 'يدعم ملفات .xlsx (Excel) و .json',
    filePreview:      'معاينة الملف',
    confirmImport:    'تأكيد الاستيراد',
    importFailed:     'فشل الاستيراد',
    tryAgain:         'حاول مرة أخرى',
    noExpenses:       'لا توجد مصروفات في هذا الملف.',
    noFuel:           'لا توجد سجلات وقود في هذا الملف.',
    unsupportedFile:  'نوع الملف غير مدعوم. يرجى استخدام ملف .xlsx أو .json.',

    /* --- Export / Import --- */
    exportSummary:   'ملخص التصدير',
    expenseCount:    'سجلات المصروفات',
    fuelCount:       'سجلات الوقود',
    expenseTotal:    'إجمالي المصروفات',
    fuelTotal:       'إجمالي الوقود',
    kartaTotal:      'إجمالي الكارتة',
    grandTotal:      'الإجمالي الكلي',
    dateRange:       'نطاق التاريخ',
    fromDate:        'من',
    toDate:          'إلى',
    dateRangeHint:   'اترك الحقلين فارغين لتصدير جميع السجلات.',
    fieldMember:     'عضو الفريق الميداني',
    trackingNum:     'رقم التتبع',
    clearAfterExport:'مسح البيانات بعد التصدير',
    exportChecklist: 'قبل التصدير',
    approvedEntries: 'السجلات المعتمدة',
    flaggedEntries:  'السجلات المُعلَّمة',
    pendingEntries:  'السجلات قيد المراجعة',

    /* --- Approval Footer --- */
    approval:           'إعتماد',                                    /* إعتماد          */
    accountsManager:    'مدير الحسابات', /* مدير الحسابات */
    responsibleManager: 'المدير المسؤل',  /* المدير المسؤل */
  },
};
