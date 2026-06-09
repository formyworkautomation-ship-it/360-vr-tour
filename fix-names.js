const fs = require('fs');
const path = require('path');

// 1. تحديد مسار مجلد الصور الأصلية ومسار ملف الـ JSON
const rawImagesDir = path.join(__dirname, '..', 'raw_images');
const jsonPath = path.join(__dirname, 'public', 'data', 'final_project_data.json');

if (!fs.existsSync(rawImagesDir)) {
  console.log("❌ لم أتمكن من العثور على مجلد raw_images. تأكد أنه موجود في المشروع الرئيسي.");
  process.exit(1);
}

// 2. قراءة الأسماء الحقيقية للصور من المجلد
const files = fs.readdirSync(rawImagesDir);
const actualNames = {};

files.forEach(file => {
  // استخراج الرقم التسلسلي الأخير من الصورة (مثال: استخراج 239 من IMG_..._00_239.jpg)
  const match = file.match(/_(\d+)\.[a-zA-Z0-9]+$/);
  if (match) {
    const seq = match[1];
    const nameWithoutExt = file.replace(/\.[^/.]+$/, "");
    actualNames[seq] = nameWithoutExt;
  }
});

// 3. قراءة ملف JSON الحالي
let jsonContent = fs.readFileSync(jsonPath, 'utf8');

// 4. استبدال وتصحيح أي اسم خاطئ بالاسم الحقيقي
let replacementsCount = 0;
jsonContent = jsonContent.replace(/IMG_\d+_\d+_00_(\d+)/g, (match, seq) => {
  if (actualNames[seq] && actualNames[seq] !== match) {
    replacementsCount++;
    return actualNames[seq];
  }
  return match;
});

fs.writeFileSync(jsonPath, jsonContent, 'utf8');
console.log(`✅ تمت العملية بنجاح خرافي! تم تصحيح وتحديث ${replacementsCount} اسم داخل ملف الـ JSON ليتطابق مع سوبابيز.`);