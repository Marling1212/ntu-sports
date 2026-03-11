const fs = require('fs');
const file = 'C:/Users/maste/OneDrive/Desktop/網路服務/Final/IMPROVEMENTS_RECOMMENDATIONS.md';
let text = fs.readFileSync(file, 'utf8');

const replacements = [
  ['### 1. **Simple Auto-Refresh Button** ⚡', '### 1. **Simple Auto-Refresh Button** ⚡ (Desktop & Mobile)'],
  ['### 2. **Better Loading States**', '### 2. **Better Loading States** (Desktop & Mobile)'],
  ['### 3. **Simple Filtering on Schedule Page**', '### 3. **Simple Filtering on Schedule Page** (Desktop & Mobile)'],
  ['### 4. **Copy Match Link Button**', '### 4. **Copy Match Link Button** (Desktop & Mobile)'],
  ['### 5. **Print-Friendly Views**', '### 5. **Print-Friendly Views** (Desktop Only)'],
  ['### 6. **Simple Calendar Export** 📅', '### 6. **Simple Calendar Export** 📅 (Desktop & Mobile)'],
  ['### 7. **Better Empty States**', '### 7. **Better Empty States** (Desktop & Mobile)'],
  ['### 8. **Improved Table Sorting**', '### 8. **Improved Table Sorting** (Desktop & Mobile)'],
  ['### 9. **Breadcrumb Navigation**', '### 9. **Breadcrumb Navigation** (Desktop & Mobile)'],
  ['### 10. **Last Updated Timestamp**', '### 10. **Last Updated Timestamp** (Desktop & Mobile)'],
  ['### 11. **Simple Dark Mode Toggle**', '### 11. **Simple Dark Mode Toggle** (Desktop & Mobile)'],
  ['### 12. **Better Error Messages**', '### 12. **Better Error Messages** (Desktop & Mobile)'],
  ['### 13. **Keyboard Shortcuts**', '### 13. **Keyboard Shortcuts** (Desktop Only)'],
  ['### 14. **Share Match with Preview**', '### 14. **Share Match with Preview** (Desktop & Mobile)'],
  ['### 15. **Optimize Image Assets & Banners**', '### 15. **Optimize Image Assets & Banners** (Mobile primarily)'],
  ['### 16. **Interactive Micro-Animations**', '### 16. **Interactive Micro-Animations** (Desktop primarily)'],
  ['### 17. **Global Footer**', '### 17. **Global Footer** (Desktop & Mobile)']
];

for (const [search, replace] of replacements) {
  text = text.replace(search, replace);
}

fs.writeFileSync(file, text);
