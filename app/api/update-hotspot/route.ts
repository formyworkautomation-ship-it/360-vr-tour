import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sourceSceneId, targetSceneId, yaw, pitch, newYaw, newPitch, newTargetSceneId, type, customImageUrl, opacity, label, rotation } = await request.json();
    
    const filePath = path.join(process.cwd(), 'public', 'data', 'final_project_data.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const projectData = JSON.parse(fileData);

    const sceneToUpdate = projectData.scenes.find((s: any) => s.sceneId === sourceSceneId);
    
    if (sceneToUpdate) {
      // البحث عن النقطة المحددة بدقة باستخدام الإحداثيات القديمة لضمان عدم الخطأ
      const hotspot = sceneToUpdate.hotspots.find((h: any) => h.targetSceneId === targetSceneId && h.yaw === yaw && h.pitch === pitch);
      
      if (hotspot) {
        if (newYaw !== undefined) hotspot.yaw = newYaw;
        if (newPitch !== undefined) hotspot.pitch = newPitch;
        if (newTargetSceneId !== undefined) hotspot.targetSceneId = newTargetSceneId;
        if (type !== undefined) hotspot.type = type;
        if (customImageUrl !== undefined) hotspot.customImageUrl = customImageUrl;
        if (opacity !== undefined) hotspot.opacity = opacity;
        if (label !== undefined) hotspot.label = label;
        if (rotation !== undefined) hotspot.rotation = rotation;
      }
    }

    await fs.writeFile(filePath, JSON.stringify(projectData, null, 4), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}