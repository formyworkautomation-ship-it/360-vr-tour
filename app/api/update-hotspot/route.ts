import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    // استقبال البيانات (الإحداثيات الجديدة) من المتصفح
    const { sourceSceneId, targetSceneId, newTargetSceneId, yaw, pitch, type, customImageUrl, opacity, label } = await request.json();

    // تحديد مسار ملف JSON الخاص بالمشروع
    const filePath = path.join(process.cwd(), 'public', 'data', 'final_project_data.json');

    // قراءة محتوى الملف الحالي
    const fileData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(fileData);

    // البحث عن المشهد والنقطة المطلوبة لتحديثهما
    const sceneIndex = data.scenes.findIndex((s: any) => s.sceneId === sourceSceneId);
    if (sceneIndex > -1) {
      const hotspotIndex = data.scenes[sceneIndex].hotspots.findIndex((h: any) => h.targetSceneId === targetSceneId);
      
      if (hotspotIndex > -1) {
        // تحديث الإحداثيات
        if (yaw !== undefined) data.scenes[sceneIndex].hotspots[hotspotIndex].yaw = yaw;
        if (pitch !== undefined) data.scenes[sceneIndex].hotspots[hotspotIndex].pitch = pitch;
        if (type !== undefined) data.scenes[sceneIndex].hotspots[hotspotIndex].type = type;
        if (customImageUrl !== undefined) data.scenes[sceneIndex].hotspots[hotspotIndex].customImageUrl = customImageUrl;
        if (opacity !== undefined) data.scenes[sceneIndex].hotspots[hotspotIndex].opacity = opacity;
        if (label !== undefined) data.scenes[sceneIndex].hotspots[hotspotIndex].label = label;
        if (newTargetSceneId !== undefined) data.scenes[sceneIndex].hotspots[hotspotIndex].targetSceneId = newTargetSceneId;

        // حفظ الملف مرة أخرى
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ success: false, error: 'Hotspot not found' }, { status: 404 });
  } catch (error) {
    console.error('Error updating hotspot:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
