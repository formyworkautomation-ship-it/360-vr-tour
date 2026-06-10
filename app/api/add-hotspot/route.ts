import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { sourceSceneId, targetSceneId, yaw, pitch, type, label } = await request.json();
    
    const filePath = path.join(process.cwd(), 'public', 'data', 'final_project_data.json');
    const fileData = await fs.readFile(filePath, 'utf-8');
    const projectData = JSON.parse(fileData);

    const sceneToUpdate = projectData.scenes.find((s: any) => s.sceneId === sourceSceneId);
    
    if (sceneToUpdate) {
      // التأكد من عدم تكرار النقطة لنفس المشهد
      const existingHotspot = sceneToUpdate.hotspots.find((h: any) => h.targetSceneId === targetSceneId);
      
      if (existingHotspot) {
        existingHotspot.yaw = yaw;
        existingHotspot.pitch = pitch;
      } else {
        sceneToUpdate.hotspots.push({
          targetSceneId,
          yaw,
          pitch,
          type: type || 'ground-radar',
          label: label || ''
        });
      }
    }

    await fs.writeFile(filePath, JSON.stringify(projectData, null, 4), 'utf-8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}