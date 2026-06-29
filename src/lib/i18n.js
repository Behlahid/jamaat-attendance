'use client';

const translations = {
  en: {
    // App
    appName: 'Jamaat Attendance',
    enterPin: 'Enter PIN to continue',
    wrongPin: 'Wrong PIN. Try again.',
    defaultPin: 'Default PIN: 1234',
    lock: 'Lock',

    // Tabs
    attendance: 'Attendance',
    history: 'History',
    importCsv: 'Import CSV',
    settings: 'Settings',

    // Stats
    total: 'Total',
    present: 'Present',
    absent: 'Absent',

    // Mark Attendance
    markAttendance: 'Mark Attendance',
    enterItsId: 'Enter ITS ID…',
    mark: 'Mark',
    scanNfc: 'Scan NFC Card',
    nfcScanning: 'Scanning… tap again to stop',
    nfcChromeOnly: 'NFC (Chrome Android only)',
    nfcReady: 'Ready — tap an NFC card now',
    nfcPermDenied: 'NFC permission denied — allow it in browser',
    nfcNotSupported: 'NFC not supported on this device',
    nfcNeedChrome: 'NFC needs Chrome on Android with NFC turned on',
    nfcCantRead: 'Could not read that card',

    // Toast messages
    notFound: 'Not found',
    alreadyMarked: 'Already marked',
    markedPresent: 'Present',
    sessionSaved: 'Session saved!',
    csvDownloaded: 'CSV downloaded!',
    noAttendance: 'No attendance marked yet',
    membersLoaded: 'members loaded',
    addedMembers: 'new members added',

    // Member list
    members: 'Members',
    all: 'All',
    searchPlaceholder: 'Search name or ITS ID…',
    noMembers: 'No members found',
    its: 'ITS',
    hfid: 'HFID',
    barcode: 'Barcode',
    status: 'Status',
    presentAt: 'Present at',
    removeAttendance: 'Remove Attendance',
    markPresent: 'Mark Present',
    confirmRemove: 'Remove attendance for this member?',

    // Export
    exportCsv: 'Export CSV',
    saveSession: 'Save Session',
    exportPresentOnly: 'Export Present Only',

    // History
    noSessions: 'No sessions saved yet.',
    markAndSave: 'Mark attendance and tap Save Session.',
    view: 'View',
    export: 'Export',
    delete: 'Delete',
    confirmDelete: 'Delete this session?',

    // Import
    importMembers: 'Import Member CSV',
    importDesc: 'Upload a CSV with columns: ITS_ID, Name, HFID, BackBarcode',
    tapToChoose: 'Tap to choose CSV file',
    dragDrop: 'or drag and drop here',
    downloadTemplate: 'Download CSV Template',
    templateDesc: 'Download a blank CSV template to fill in your member data.',
    preview: 'Preview',
    membersFound: 'members found',
    replaceAll: 'Replace All Members',
    mergeAdd: 'Merge / Add',
    cancel: 'Cancel',
    csvEmpty: 'CSV seems empty',
    noIdColumn: 'Could not find ITS_ID column',
    noValidRows: 'No valid rows found',
    andMore: 'and more',

    // Settings
    language: 'Language',
    english: 'English',
    urdu: 'اردو',
    darkMode: 'Dark Mode',
    pin: 'PIN',
    changePin: 'Change PIN',
    currentPin: 'Current PIN',
    newPin: 'New PIN',
    confirmPin: 'Confirm PIN',
    pinChanged: 'PIN changed successfully!',
    pinMismatch: 'PINs do not match',
    wrongCurrentPin: 'Current PIN is incorrect',

    // Events
    newEvent: 'New Event',
    eventName: 'Event Name',
    createEvent: 'Create Event',
    selectEvent: 'Select Event',
    noEvents: 'No events yet',
    activeEvent: 'Active Event',
  },
  ur: {
    // App
    appName: 'جماعت حاضری',
    enterPin: 'جاری رکھنے کے لیے PIN درج کریں',
    wrongPin: 'غلط PIN۔ دوبارہ کوشش کریں۔',
    defaultPin: 'ڈیفالٹ PIN: 1234',
    lock: 'لاک',

    // Tabs
    attendance: 'حاضری',
    history: 'تاریخ',
    importCsv: 'CSV درآمد',
    settings: 'ترتیبات',

    // Stats
    total: 'کل',
    present: 'حاضر',
    absent: 'غائب',

    // Mark Attendance
    markAttendance: 'حاضری لگائیں',
    enterItsId: 'ITS ID درج کریں…',
    mark: 'لگائیں',
    scanNfc: 'NFC کارڈ اسکین کریں',
    nfcScanning: 'اسکین ہو رہا ہے… روکنے کے لیے دبائیں',
    nfcChromeOnly: 'NFC (صرف Chrome Android)',
    nfcReady: 'تیار — اب NFC کارڈ لگائیں',
    nfcPermDenied: 'NFC اجازت مسترد — براؤزر میں اجازت دیں',
    nfcNotSupported: 'اس آلے پر NFC دستیاب نہیں',
    nfcNeedChrome: 'NFC کے لیے Android پر Chrome درکار ہے',
    nfcCantRead: 'یہ کارڈ پڑھ نہیں سکے',

    // Toast
    notFound: 'نہیں ملا',
    alreadyMarked: 'پہلے سے لگایا ہوا ہے',
    markedPresent: 'حاضر',
    sessionSaved: 'سیشن محفوظ ہو گیا!',
    csvDownloaded: 'CSV ڈاؤن لوڈ ہو گئی!',
    noAttendance: 'ابھی تک کوئی حاضری نہیں لگائی گئی',
    membersLoaded: 'ممبران لوڈ ہو گئے',
    addedMembers: 'نئے ممبران شامل کیے گئے',

    // Member list
    members: 'ممبران',
    all: 'سب',
    searchPlaceholder: 'نام یا ITS ID تلاش کریں…',
    noMembers: 'کوئی ممبر نہیں ملا',
    its: 'ITS',
    hfid: 'HFID',
    barcode: 'بارکوڈ',
    status: 'حالت',
    presentAt: 'حاضر بوقت',
    removeAttendance: 'حاضری ہٹائیں',
    markPresent: 'حاضر لگائیں',
    confirmRemove: 'اس ممبر کی حاضری ہٹائیں؟',

    // Export
    exportCsv: 'CSV ایکسپورٹ',
    saveSession: 'سیشن محفوظ کریں',
    exportPresentOnly: 'صرف حاضرین ایکسپورٹ',

    // History
    noSessions: 'ابھی تک کوئی سیشن محفوظ نہیں۔',
    markAndSave: 'حاضری لگائیں اور سیشن محفوظ کریں۔',
    view: 'دیکھیں',
    export: 'ایکسپورٹ',
    delete: 'حذف',
    confirmDelete: 'یہ سیشن حذف کریں؟',

    // Import
    importMembers: 'ممبران CSV درآمد',
    importDesc: 'CSV اپ لوڈ کریں جس میں: ITS_ID, Name, HFID, BackBarcode ہو',
    tapToChoose: 'CSV فائل منتخب کرنے کے لیے ٹیپ کریں',
    dragDrop: 'یا یہاں گھسیٹ کر چھوڑیں',
    downloadTemplate: 'CSV ٹیمپلیٹ ڈاؤن لوڈ',
    templateDesc: 'اپنے ممبران کا ڈیٹا بھرنے کے لیے خالی CSV ٹیمپلیٹ ڈاؤن لوڈ کریں۔',
    preview: 'جائزہ',
    membersFound: 'ممبران ملے',
    replaceAll: 'سب تبدیل کریں',
    mergeAdd: 'ضم / شامل کریں',
    cancel: 'منسوخ',
    csvEmpty: 'CSV خالی لگتی ہے',
    noIdColumn: 'ITS_ID کالم نہیں ملا',
    noValidRows: 'کوئی درست قطاریں نہیں ملیں',
    andMore: 'اور مزید',

    // Settings
    language: 'زبان',
    english: 'English',
    urdu: 'اردو',
    darkMode: 'ڈارک موڈ',
    pin: 'PIN',
    changePin: 'PIN تبدیل کریں',
    currentPin: 'موجودہ PIN',
    newPin: 'نیا PIN',
    confirmPin: 'PIN کی تصدیق',
    pinChanged: 'PIN کامیابی سے تبدیل ہو گیا!',
    pinMismatch: 'PIN مماثل نہیں',
    wrongCurrentPin: 'موجودہ PIN غلط ہے',

    // Events
    newEvent: 'نئی تقریب',
    eventName: 'تقریب کا نام',
    createEvent: 'تقریب بنائیں',
    selectEvent: 'تقریب منتخب کریں',
    noEvents: 'ابھی تک کوئی تقریب نہیں',
    activeEvent: 'فعال تقریب',
  },
};

export function getTranslations(lang = 'en') {
  return translations[lang] || translations.en;
}

export function isRTL(lang) {
  return lang === 'ur';
}

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
];
