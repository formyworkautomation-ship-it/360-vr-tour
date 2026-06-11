'use client';

import { useEffect, useRef, useState } from 'react';
import Marzipano from 'marzipano';

// دالة لتوليد أشكال مختلفة من النقاط الساخنة (نُقلت للخارج لتستخدمها واجهة التعديل)
const getHotspotStyle = (type: string, customImageUrl?: string, opacity: number = 1) => {
  if (type === 'custom-image' && customImageUrl) {
    return `
      <div style="position: relative; width: 55px; height: 55px; border-radius: 50%; overflow: hidden; box-shadow: 0 4px 15px rgba(255,255,255,0.15); border: 2px solid white; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; opacity: ${opacity};">
        <img src="${customImageUrl}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'" />
      </div>
    `;
  }
  switch (type) {
    case 'ground-radar':
      return `
        <div class="hs-ground-radar" style="opacity: ${opacity};">
          <div class="ring"></div>
          <div class="ring"></div>
          <div class="core"></div>
        </div>
      `;
    case 'orb':
      return `
        <div class="hs-orb" style="opacity: ${opacity};">
           <div class="orb-ring"></div>
           <div class="orb-core"></div>
        </div>
      `;
    case 'map-pin':
      return `
        <div class="hs-map-pin" style="opacity: ${opacity};">
          <div class="pin"></div>
          <div class="pulse"></div>
        </div>
      `;
    case 'arrow':
    default:
      return `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; opacity: ${opacity};">
          <div style="position: absolute; width: 100%; height: 100%; background: rgba(255, 255, 255, 0.5); border-radius: 50%; animation: pulse-animation 2s infinite;"></div>
          <div style="position: relative; background: rgba(0,0,0,0.6); width: 36px; height: 36px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); box-shadow: 0 4px 10px rgba(0,0,0,0.5);">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        </div>
      `;
  }
};

// --- دالة رياضية جديدة لحساب الحجم بناءً على البعد الرأسي (Pitch) ---
// pitch = 0 (الأفق) => أصغر حجم
// pitch = -PI/2 (أسفل الكاميرا) => أكبر حجم
const calculateScale = (pitch: number) => {
  // أخذ القيمة المطلقة لتجنب الانعكاس، 0=الأفق (أبعد)، 1.57=رأسي (أقرب)
  const absPitch = Math.abs(pitch);
  const ratio = Math.min(1, absPitch / (Math.PI / 2));
  
  const minScale = 0.65; // حجم أصغر في الأفق (بعيد) لزيادة الواقعية
  const maxScale = 2.5;  // حجم كبير أسفل الكاميرا

  // منحنى تكبير أسي لجعل الانتقال طبيعياً
  return minScale + (maxScale - minScale) * Math.pow(ratio, 1.8);
};

export default function MarzipanoViewer() {
  const viewerRef = useRef<HTMLDivElement>(null);

  // حالة نافذة التعديل والتحكم المتقدمة
  const [editingHotspot, setEditingHotspot] = useState<any>(null);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string>('');
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [tempSceneName, setTempSceneName] = useState<string>('');
  const [projectData, setProjectData] = useState<any>(null);
  const hotspotElementsRef = useRef<Record<string, Record<string, HTMLElement>>>({});
  const viewerInstanceRef = useRef<any>(null);
  const scenesRef = useRef<Record<string, any>>({});

  // تم استبدال [YOUR_BUCKET_NAME] باسم الـ Bucket الحقيقي
  const SUPABASE_STORAGE_URL = "https://ejvnmawlifhdytktdzer.supabase.co/storage/v1/object/public/tours/project_01/";

  // السماح بتعديل أماكن الأسهم فقط في بيئة التطوير (أثناء تشغيل npm run dev)
  const isEditMode = process.env.NODE_ENV === 'development';

  // --- جلب البيانات ديناميكياً لتخطي كاش Next.js العنيد ---
  useEffect(() => {
    fetch('/data/final_project_data.json?t=' + new Date().getTime())
      .then(res => res.json())
      .then(data => setProjectData(data))
      .catch(err => console.error("Error fetching project data:", err));
  }, []);

  // جلب الأيقونات المتوفرة آلياً لعرضها في لوحة التحكم
  useEffect(() => {
    if (isEditMode) {
      fetch('/api/list-icons')
        .then(res => {
          if (!res.ok) {
            console.warn("مسار الأيقونات قيد التجهيز من قبل Turbopack...");
            return { icons: [] };
          }
          return res.json();
        })
        .then(data => { if (data.icons) setAvailableIcons(data.icons); })
        .catch(err => console.error("Error fetching icons:", err));
    }
  }, [isEditMode]);

  useEffect(() => {
    const viewerElement = viewerRef.current;
    if (!viewerElement || !projectData) return;

    const viewer = new Marzipano.Viewer(viewerElement);
    viewerInstanceRef.current = viewer; // حفظ النسخة لاستخدامها عند الإفلات
    const scenes: Record<string, any> = {};
    hotspotElementsRef.current = {};

    projectData.scenes.forEach((sceneData) => {
      const imageUrl = `${SUPABASE_STORAGE_URL}${sceneData.sceneId}/base.webp`;
      console.log("رابط الصورة الذي يحاول الموقع تحميله:", imageUrl);
      const source = Marzipano.ImageUrlSource.fromString(imageUrl);
      const geometry = new Marzipano.EquirectGeometry([{ width: 8192 }]); 
      
      const view = new Marzipano.RectilinearView(
        {
          yaw: sceneData.initialYaw ?? 0,
          pitch: sceneData.initialPitch ?? 0,
          fov: Math.PI / 2 // زاوية 90 درجة بدلاً من 45 المسببة للزوم الشديد
        }
      );

      const scene = viewer.createScene({
        source: source,
        geometry: geometry,
        view: view
      });

      scenes[sceneData.sceneId] = { scene, data: sceneData };
    });

    scenesRef.current = scenes; // تعريض المشاهد للخارج ليتمكن شريط الصور من استخدامها

    projectData.scenes.forEach((sceneData) => {
      const currentSceneObj = scenes[sceneData.sceneId].scene;
      if (!hotspotElementsRef.current[sceneData.sceneId]) hotspotElementsRef.current[sceneData.sceneId] = {};
      
      // --- إضافة شعار الأرضية لإخفاء حامل الكاميرا (Nadir Logo) ---
      const nadirElement = document.createElement('div');
      nadirElement.className = 'nadir-logo';
      nadirElement.innerHTML = `<img src="/logo.png" alt="Company Logo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; box-shadow: 0 0 30px rgba(0,0,0,0.8);" onerror="this.style.display='none'" />`;
      
      currentSceneObj.hotspotContainer().createHotspot(nadirElement, 
        { yaw: 0, pitch: Math.PI / 2 }, 
        { perspective: { radius: 1000 } } 
      );

      sceneData.hotspots.forEach((hotspot: any) => {
        // الحاوية الأساسية (لإحداثيات Marzipano)
        const hotspotWrapper = document.createElement('div');
        
        const distance = hotspot.distance || 3.0;
        const type = hotspot.type || 'ground-radar';
        const opacity = hotspot.opacity !== undefined ? hotspot.opacity : 1;
        const label = hotspot.label || '';

        hotspotWrapper.style.zIndex = Math.round(1000 - distance).toString();
        // العنصر المرئي (للتصميم والحركة)
        const hotspotVisual = document.createElement('div');
        hotspotVisual.className = 'hotspot-visual';
        hotspotVisual.style.cursor = isEditMode ? 'grab' : 'pointer';
        hotspotVisual.title = label; // ضمان ظهور اسم الغرفة (Native Tooltip) كحل احتياطي قوي

        // --- تطبيق الحجم المبدئي بناءً على زاوية الميل الأولية ---
        const initialScale = calculateScale(hotspot.pitch);
        hotspotVisual.style.setProperty('--depth-scale', initialScale.toString());

        // 1. حاوية النص التوضيحي
        const tooltip = document.createElement('div');
        tooltip.className = 'hs-tooltip';
        tooltip.style.display = label ? 'block' : 'none';
        tooltip.innerHTML = `
          <span class="hs-tooltip-text">${label}</span>
          <div class="hs-tooltip-arrow"></div>
        `;
        
        // 2. حاوية الأيقونة أو الشكل المختار
        const iconContainer = document.createElement('div');
        iconContainer.className = 'hs-icon-container';
        iconContainer.innerHTML = getHotspotStyle(type, hotspot.customImageUrl, opacity);
        
        hotspotVisual.appendChild(tooltip);
        hotspotVisual.appendChild(iconContainer);
        hotspotWrapper.appendChild(hotspotVisual);
        hotspotElementsRef.current[sceneData.sceneId][hotspot.targetSceneId] = hotspotVisual;
        
        const hs = currentSceneObj.hotspotContainer().createHotspot(hotspotWrapper, {
          yaw: hotspot.yaw,
          pitch: hotspot.pitch
        });

        if (isEditMode) {
          // --- فتح نافذة التعديل عند الضغط بزر الماوس الأيمن (كليك يمين) ---
          hotspotVisual.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditingHotspot({
              sourceSceneId: sceneData.sceneId,
              targetSceneId: hotspot.targetSceneId,
                  yaw: hotspot.yaw,
                  pitch: hotspot.pitch,
              type: type,
              customImageUrl: hotspot.customImageUrl || '',
              opacity: opacity,
              label: label,
              domElement: hotspotVisual,
              originalHotspotRef: hotspot
            });
          });

          // --- منطق السحب والإفلات (للمطور فقط) ---
          let isDragging = false;
          let startX = 0;
          let startY = 0;
  
          hotspotVisual.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // السماح للكليك يمين بالمرور لفتح القائمة
            e.preventDefault();
            e.stopPropagation();
            viewer.controls().disable();
            isDragging = false;
            startX = e.clientX;
            startY = e.clientY;
            hotspotVisual.style.cursor = 'grabbing';
            
            const onMouseMove = (moveEvent: MouseEvent) => {
              const dx = moveEvent.clientX - startX;
              const dy = moveEvent.clientY - startY;
              if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                isDragging = true;
              }
              if (isDragging) {
                const view = viewer.view();
                if (!view) return;
                const rect = viewerElement.getBoundingClientRect();
                const coords = view.screenToCoordinates({ x: moveEvent.clientX - rect.left, y: moveEvent.clientY - rect.top });
                if (coords) hs.setPosition(coords);

                // --- تطبيق التحجيم الديناميكي لحظة بلحظة أثناء السحب ---
                const newScale = calculateScale(coords.pitch);
                hotspotVisual.style.setProperty('--depth-scale', newScale.toString());
              }
            };
  
            const onMouseUp = (upEvent: MouseEvent) => {
              viewer.controls().enable();
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
              
              if (isDragging) {
                const view = viewer.view();
                if (!view) return;
                const rect = viewerElement.getBoundingClientRect();
                const coords = view.screenToCoordinates({ x: upEvent.clientX - rect.left, y: upEvent.clientY - rect.top });
                if (coords) {
                  // --- إعادة تطبيق الحجم النهائي وتغيير شكل المؤشر ---
                  const finalScale = calculateScale(coords.pitch);
                  hotspotVisual.style.setProperty('--depth-scale', finalScale.toString());
                  hotspotVisual.style.cursor = 'grab';

                  console.log(`📌 سهم الانتقال للمشهد [${hotspot.targetSceneId}] تم نقله!`);
                  
                  fetch('/api/update-hotspot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sourceSceneId: sceneData.sceneId,
                      targetSceneId: hotspot.targetSceneId,
                      yaw: coords.yaw,
                      pitch: coords.pitch
                    })
                  })
                .then(res => {
                  if (!res.ok) {
                    console.warn("مسار الحفظ قيد التجهيز من قبل Turbopack...");
                    return { success: false };
                  }
                  return res.json();
                })
                  .then(data => {
                    if (data.success) console.log("✅ تم حفظ الإحداثيات تلقائياً في ملف JSON!");
                    else console.error("❌ حدث خطأ أثناء الحفظ:", data.error);
                  })
                  .catch(err => console.error("❌ فشل الاتصال بالخادم للحفظ:", err));
                }
              } else {
                hotspotVisual.style.cursor = 'grab'; // إعادة المؤشر في حالة النقر العادي
                const target = scenes[hotspot.targetSceneId];
                if (target) {
                  // الحفاظ على اتجاه الرؤية عند الانتقال للمطور
                  const currentView = viewer.view();
                  if (currentView && sceneData.northOffset !== undefined && target.data.northOffset !== undefined) {
                    const absoluteCompassYaw = currentView.yaw() + sceneData.northOffset;
                    const newTargetYaw = absoluteCompassYaw - target.data.northOffset;
                    target.scene.view().setYaw(newTargetYaw);
                    target.scene.view().setPitch(currentView.pitch());
                  }
                  target.scene.switchTo({ transitionDuration: 1200 });
                  setCurrentSceneId(hotspot.targetSceneId);
                }
              }
            };
  
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
          });
        } else {
          // --- منطق الضغط العادي (للعميل / الزائر) ---
          hotspotVisual.addEventListener('click', (e) => {
             e.preventDefault();
             e.stopPropagation();
             const target = scenes[hotspot.targetSceneId];
             if (target) {
               console.log(`جاري الانتقال إلى المشهد: ${hotspot.targetSceneId}`);
               
               // --- الإبقاء على اتجاه البوصلة للعميل لمنع الضياع المعماري ---
               const currentView = viewer.view();
               if (currentView && sceneData.northOffset !== undefined && target.data.northOffset !== undefined) {
                 const absoluteCompassYaw = currentView.yaw() + sceneData.northOffset;
                 const newTargetYaw = absoluteCompassYaw - target.data.northOffset;
                 target.scene.view().setYaw(newTargetYaw);
                 target.scene.view().setPitch(currentView.pitch());
               }

               target.scene.switchTo({ transitionDuration: 1200 });
               setCurrentSceneId(hotspot.targetSceneId);
             } else {
               console.error(`المشهد المطلوب غير موجود في بيانات JSON: ${hotspot.targetSceneId}`);
             }
          });
        }
      });
    });

    if (projectData.scenes.length > 0) {
      // إصلاح القفز الإجباري: ابق في المشهد الحالي بعد التحديث، أو اذهب للأول عند التحميل المبدئي
      const sceneToLoad = currentSceneId && scenes[currentSceneId] 
        ? currentSceneId 
        : projectData.scenes[0].sceneId;
      scenes[sceneToLoad].scene.switchTo();
      setCurrentSceneId(sceneToLoad);
    }

    return () => {
      viewer.destroy();
    };
  }, [projectData, isEditMode]);

  // --- منطق حذف النقطة التفاعلية ---
  const handleDeleteHotspot = async () => {
    if (!editingHotspot) return;
    
    // إخفاء العنصر بصرياً فقط لتجنب تعارض الـ DOM مع محرك Marzipano عند تدمير المشهد
    const wrapper = editingHotspot.domElement.parentElement;
    if (wrapper) {
      wrapper.style.display = 'none';
    }

    try {
      const res = await fetch('/api/delete-hotspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSceneId: editingHotspot.sourceSceneId,
          targetSceneId: editingHotspot.targetSceneId,
          yaw: editingHotspot.yaw,
          pitch: editingHotspot.pitch
        })
      });
      
      if (res.ok) {
        const updatedData = JSON.parse(JSON.stringify(projectData));
        const scene = updatedData.scenes.find((s: any) => s.sceneId === editingHotspot.sourceSceneId);
        if (scene) {
          scene.hotspots = scene.hotspots.filter((h: any) => !(h.targetSceneId === editingHotspot.targetSceneId && h.yaw === editingHotspot.yaw && h.pitch === editingHotspot.pitch));
          setProjectData(updatedData);
        }
      }
    } catch (e) {
      console.error("❌ حدث خطأ أثناء الحذف:", e);
    }
    
    setEditingHotspot(null);
  };

  // دالة حفظ التغييرات من لوحة التحكم
  const handleSaveEdit = async () => {
    if (!editingHotspot) return;
    
    // تحديث الشكل فوراً في المشهد
    editingHotspot.domElement.title = editingHotspot.label || '';
    const tooltip = editingHotspot.domElement.querySelector('.hs-tooltip');
    if (tooltip) {
      if (editingHotspot.label) {
        tooltip.style.display = 'block';
        const textSpan = tooltip.querySelector('.hs-tooltip-text');
        if (textSpan) textSpan.textContent = editingHotspot.label;
      } else {
        tooltip.style.display = 'none';
      }
    }
    const iconContainer = editingHotspot.domElement.querySelector('.hs-icon-container');
    if (iconContainer) {
      iconContainer.innerHTML = getHotspotStyle(editingHotspot.type, editingHotspot.customImageUrl, editingHotspot.opacity);
    }

    // تحديث الوجهة في الذاكرة فوراً لتجنب الحاجة لعمل ريفريش
    if (editingHotspot.newTargetSceneId) {
      editingHotspot.originalHotspotRef.targetSceneId = editingHotspot.newTargetSceneId;
    }

    try {
      const res = await fetch('/api/update-hotspot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSceneId: editingHotspot.sourceSceneId,
          targetSceneId: editingHotspot.targetSceneId,
          newTargetSceneId: editingHotspot.newTargetSceneId,
          type: editingHotspot.type,
          customImageUrl: editingHotspot.customImageUrl,
          opacity: editingHotspot.opacity,
          label: editingHotspot.label
        })
      });
      if (!res.ok) {
        console.warn("مسار الحفظ قيد التجهيز من قبل Turbopack...");
      }
    } catch (e) {
      console.error("❌ حدث خطأ أثناء الحفظ:", e);
    }
    setEditingHotspot(null);
  };

  // --- منطق حفظ الاسم العام للمشهد ---
  const handleSaveSceneName = async (sceneId: string) => {
    if (!tempSceneName.trim()) {
      setEditingSceneId(null);
      return;
    }
    try {
      const res = await fetch('/api/update-scene-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sceneId, newName: tempSceneName })
      });
      if (res.ok) {
        const updatedData = JSON.parse(JSON.stringify(projectData));
        const scene = updatedData.scenes.find((s: any) => s.sceneId === sceneId);
        if (scene) scene.name = tempSceneName;
        setProjectData(updatedData);
      }
    } catch (e) {
      console.error("❌ فشل حفظ اسم المشهد:", e);
    }
    setEditingSceneId(null);
  };

  // --- منطق منصة البناء: استقبال الصورة المسحوبة وتحويلها لنقطة ساخنة ---
  const handleDropOnViewer = async (e: React.DragEvent) => {
    e.preventDefault();
    const targetId = e.dataTransfer.getData('targetSceneId');
    if (!targetId || targetId === currentSceneId) return;

    const viewer = viewerInstanceRef.current;
    if (!viewer || !viewerRef.current) return;

    const rect = viewerRef.current.getBoundingClientRect();
    const view = viewer.view();
    // قراءة إحداثيات الماوس الهندسية في مكان الإفلات
    const coords = view.screenToCoordinates({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    if (coords) {
      console.log(`🎯 تم إسقاط مشهد [${targetId}] لإنشاء نقطة انتقال!`);
      
      try {
        const res = await fetch('/api/add-hotspot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceSceneId: currentSceneId,
            targetSceneId: targetId,
            yaw: coords.yaw,
            pitch: coords.pitch,
            type: 'ground-radar',
            label: `إلى ${targetId.split('_').pop()}`
          })
        });
        
        if (res.ok) {
          // تحديث الواجهة فوراً لإظهار النقطة الجديدة
          const updatedData = JSON.parse(JSON.stringify(projectData));
          const sceneIndex = updatedData.scenes.findIndex((s: any) => s.sceneId === currentSceneId);
          if (sceneIndex !== -1) {
            updatedData.scenes[sceneIndex].hotspots.push({ targetSceneId: targetId, yaw: coords.yaw, pitch: coords.pitch, type: 'ground-radar', label: `إلى ${targetId.split('_').pop()}` });
            setProjectData(updatedData); // إعادة التصيير لإظهار النقطة
          }
        }
      } catch (err) {
        console.error("❌ فشل حفظ النقطة الجديدة:", err);
      }
    }
  };

  return (
    <div 
      style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#141414' }}
      onDragEnter={(e) => { e.preventDefault(); }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={handleDropOnViewer}
    >
      <style>{`
        @keyframes pulse-animation {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }

        /* --- تنسيقات الأشكال الإضافية --- */
        
        /* 1. الرادار الأرضي (يبدو مسطحاً على الأرض) */
        .hs-ground-radar {
          position: relative; width: 80px; height: 80px;
          transform: rotateX(70deg); /* هذه الخاصية تجعل العنصر نائماً على الأرض */
        }
        .hs-ground-radar .ring {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          border: 3px solid rgba(255, 255, 255, 0.9); border-radius: 50%;
          animation: radar-pulse 2s infinite ease-out;
          box-shadow: 0 0 10px rgba(255,255,255,0.7) inset, 0 0 10px rgba(255,255,255,0.7);
        }
        .hs-ground-radar .ring:nth-child(2) { animation-delay: 1s; }
        .hs-ground-radar .core {
          position: absolute; top: 50%; left: 50%;
          width: 18px; height: 18px; background: #ffffff; border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 25px rgba(255, 255, 255, 1);
        }
        @keyframes radar-pulse {
          0% { transform: scale(0.1); opacity: 1; border-width: 4px; }
          100% { transform: scale(1.6); opacity: 0; border-width: 1px; }
        }

        /* 2. الكرة الزجاجية المضيئة */
        .hs-orb { position: relative; width: 30px; height: 30px; }
        .hs-orb .orb-ring {
          position: absolute; top: -8px; left: -8px; right: -8px; bottom: -8px;
          border: 2px solid rgba(255,255,255,0.8); border-radius: 50%;
          animation: pulse-animation 1.5s infinite;
        }
        .hs-orb .orb-core {
          width: 100%; height: 100%; border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #ffffff, #0078ff);
          box-shadow: 0 4px 10px rgba(0,0,0,0.5);
        }

        /* 3. دبوس الخريطة (Map Pin) */
        .hs-map-pin { position: relative; width: 30px; height: 45px; display: flex; justify-content: center; }
        .hs-map-pin .pin {
          width: 30px; height: 30px; background: #e74c3c; border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg); border: 2px solid white; z-index: 2;
          box-shadow: inset 0 0 5px rgba(0,0,0,0.3), 2px 2px 4px rgba(0,0,0,0.4);
        }
        .hs-map-pin .pin::after {
          content: ''; position: absolute; width: 12px; height: 12px; background: white;
          border-radius: 50%; top: 50%; left: 50%; transform: translate(-50%, -50%);
        }
        .hs-map-pin .pulse {
          position: absolute; bottom: 0; width: 14px; height: 6px; background: rgba(0,0,0,0.5);
          border-radius: 50%; animation: shadow-pulse 1.5s infinite; z-index: 1;
        }
        @keyframes shadow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0.2; }
        }

        /* --- تنسيقات النقطة التفاعلية والنص التوضيحي --- */
        .hotspot-visual {
          position: absolute;
          display: flex;
          justify-content: center;
          align-items: center;
          transform: translate(-50%, -50%) scale(var(--depth-scale, 1));
          transition: transform 0.2s ease-in-out;
        }
        .hotspot-visual:hover {
          transform: translate(-50%, -50%) scale(calc(var(--depth-scale, 1) * 1.15));
          z-index: 9999;
        }
        .hs-tooltip {
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%) translateY(5px);
          margin-bottom: 15px;
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: bold;
          white-space: nowrap;
          pointer-events: none;
          opacity: 0;
          visibility: hidden;
          transition: all 0.2s ease-in-out;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
        }
        .hs-tooltip-arrow {
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border-width: 6px;
          border-style: solid;
          border-color: rgba(0,0,0,0.85) transparent transparent transparent;
        }
        .hotspot-visual:hover .hs-tooltip {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(-50%) translateY(0) !important;
        }

        /* تنسيق شعار الأرضية 3D */
        .nadir-logo {
          width: 350px;
          height: 350px;
          pointer-events: none; /* لمنع إعاقة السحب بالماوس في الأرضية */
          opacity: 0.9;
          /* هذا السطر ضروري لإجبار المتصفح على التعامل مع الشعار كجسم ثلاثي الأبعاد */
          transform-style: preserve-3d;
        }
      `}</style>
      
      {!projectData && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: '#00ffcc', fontSize: '20px', zIndex: 10 }}>جاري جلب البيانات الحية...</div>
      )}

      {/* --- منصة البناء (شريط الصور المصغرة الجانبي الأيمن) --- */}
      {isEditMode && projectData && (
        <div className="custom-scrollbar" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '130px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(10,10,10,0.85)', padding: '16px 12px', overflowY: 'auto', overflowX: 'hidden', zIndex: 1000, borderLeft: '1px solid #333', backdropFilter: 'blur(10px)' }}>
          <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #555; border-radius: 4px; }`}</style>
          {projectData.scenes.map((s: any) => {
            const isActive = s.sceneId === currentSceneId;
            return (
              <div
                key={s.sceneId}
                draggable={!isActive}
                onDragStart={(e) => {
                  e.dataTransfer.setData('targetSceneId', s.sceneId);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => {
                  if (!isActive && scenesRef.current[s.sceneId]) {
                    scenesRef.current[s.sceneId].scene.switchTo({ transitionDuration: 800 });
                    setCurrentSceneId(s.sceneId);
                  }
                }}
                style={{ width: '100%', height: '80px', borderRadius: '8px', overflow: 'hidden', border: isActive ? '2px solid #00ffcc' : '2px solid transparent', boxShadow: isActive ? '0 0 12px rgba(0, 255, 204, 0.5)' : 'none', cursor: isActive ? 'default' : 'grab', opacity: 1, position: 'relative', flexShrink: 0, transition: 'all 0.3s ease' }}
                onMouseOver={(e) => { if(!isActive) e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                <img src={`/previews/${s.sceneId}.jpg`} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isActive ? 'brightness(1.1)' : 'brightness(0.8)' }} onError={(e) => { e.currentTarget.src = '/logo.png'; }} />
                
                {isActive && (
                  <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#00ffcc', color: '#000', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', background: '#000', borderRadius: '50%', animation: 'pulse-animation 1s infinite' }}></div>
                      موقعك
                  </div>
                )}

                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: isActive ? 'linear-gradient(transparent, rgba(0, 255, 204, 0.3), rgba(0,0,0,0.9))' : 'linear-gradient(transparent, rgba(0,0,0,0.9))', color: isActive ? '#00ffcc' : 'white', fontSize: '11px', textAlign: 'center', padding: '15px 2px 4px 2px', fontWeight: 'bold' }}>
                  {editingSceneId === s.sceneId ? (
                    <input autoFocus type="text" value={tempSceneName} onChange={(e) => setTempSceneName(e.target.value)} onBlur={() => handleSaveSceneName(s.sceneId)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSceneName(s.sceneId); }} style={{ width: '90%', background: 'rgba(0,0,0,0.7)', color: '#00ffcc', border: '1px solid #00ffcc', borderRadius: '4px', textAlign: 'center', outline: 'none', fontSize: '11px', padding: '2px' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span>{s.name || s.sceneId.split('_').pop()}</span>
                      <span onClick={(e) => { e.stopPropagation(); setTempSceneName(s.name || s.sceneId.split('_').pop()); setEditingSceneId(s.sceneId); }} style={{ cursor: 'pointer', opacity: 0.7, padding: '2px' }} title="إعادة تسمية المشهد">✏️</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- واجهة تحكم متقدمة لتخصيص النقطة التفاعلية تظهر فقط عند النقر الأيمن --- */}
      {isEditMode && editingHotspot && projectData && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: '#1e1e1e', padding: '24px', borderRadius: '12px', width: '360px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)', color: 'white', display: 'flex', flexDirection: 'column', gap: '16px', border: '1px solid #333', fontFamily: 'system-ui, sans-serif' }}>
            <h3 style={{ margin: 0, borderBottom: '1px solid #333', paddingBottom: '12px', fontSize: '18px', textAlign: 'center' }}>تخصيص النقطة التفاعلية</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontSize: '14px', color: '#aaa', fontWeight: 'bold' }}>الأشكال الأساسية المبنية في الكود:</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    { id: 'ground-radar', label: 'رادار أرضي' },
                    { id: 'orb', label: 'كرة زجاجية' },
                    { id: 'map-pin', label: 'دبوس' },
                    { id: 'arrow', label: 'سهم عائم' }
                  ].map(shape => (
                    <button
                      key={shape.id}
                      onClick={() => setEditingHotspot({...editingHotspot, type: shape.id, customImageUrl: ''})}
                      style={{ padding: '8px', background: editingHotspot.type === shape.id && !editingHotspot.customImageUrl ? '#0078ff' : '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', transition: 'background 0.2s' }}
                    >
                      {shape.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <label style={{ fontSize: '14px', color: '#aaa', fontWeight: 'bold' }}>الأيقونات المخصصة (من مجلد public/icons):</label>
                {availableIcons.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', background: '#222', padding: '12px', borderRadius: '6px', border: '1px solid #333' }}>
                    {availableIcons.map(iconUrl => (
                      <div
                        key={iconUrl}
                        onClick={() => setEditingHotspot({...editingHotspot, type: 'custom-image', customImageUrl: iconUrl})}
                        style={{ width: '48px', height: '48px', borderRadius: '6px', border: editingHotspot.customImageUrl === iconUrl ? '2px solid #0078ff' : '2px solid transparent', background: '#333', padding: '4px', cursor: 'pointer', transition: 'border 0.2s' }}
                        title={iconUrl.replace('/icons/', '')}
                      >
                        <img src={iconUrl} alt="icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: '#222', padding: '16px', borderRadius: '6px', border: '1px dashed #555', color: '#888', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>
                    لم يتم العثور على أيقونات هنا.<br/>قم بإنشاء مجلد باسم <b>icons</b> داخل مجلد <b>public</b><br/>وضع صورك بداخله لتظهر هنا تلقائياً للاختيار منها.
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <label style={{ fontSize: '14px', color: '#aaa', fontWeight: 'bold' }}>شفافية الشكل (Opacity): {Math.round((editingHotspot.opacity || 1) * 100)}%</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={editingHotspot.opacity || 1}
                  onChange={(e) => setEditingHotspot({...editingHotspot, opacity: parseFloat(e.target.value)})}
                  style={{ width: '100%', cursor: 'pointer' }}
                />
              </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <label style={{ fontSize: '14px', color: '#aaa', fontWeight: 'bold' }}>اسم الغرفة (يظهر عند الوقوف بالماوس):</label>
            <input
              type="text"
              placeholder="مثال: المطبخ، الصالة..."
              value={editingHotspot.label || ''}
              onChange={(e) => setEditingHotspot({...editingHotspot, label: e.target.value})}
              style={{ width: '100%', padding: '10px', background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: '6px', outline: 'none', fontSize: '14px' }}
            />
          </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button onClick={handleSaveEdit} style={{ flex: 1, padding: '12px', background: '#0078ff', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#0066cc'} onMouseOut={e => e.currentTarget.style.background = '#0078ff'}>حفظ وتطبيق</button>
              <button onClick={handleDeleteHotspot} style={{ flex: 1, padding: '12px', background: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#c0392b'} onMouseOut={e => e.currentTarget.style.background = '#e74c3c'}>حذف النقطة</button>
              <button onClick={() => setEditingHotspot(null)} style={{ flex: 1, padding: '12px', background: 'transparent', color: '#ccc', border: '1px solid #555', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = '#333'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>إلغاء</button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
            <label style={{ fontSize: '14px', color: '#aaa', fontWeight: 'bold' }}>وجهة السهم (الانتقال إلى مشهد):</label>
            <select
              value={editingHotspot.newTargetSceneId || editingHotspot.targetSceneId}
              onChange={(e) => setEditingHotspot({...editingHotspot, newTargetSceneId: e.target.value})}
              style={{ width: '100%', padding: '10px', background: '#2a2a2a', color: 'white', border: '1px solid #444', borderRadius: '6px', outline: 'none', fontSize: '14px', cursor: 'pointer' }}
            >
              {projectData.scenes.map(s => (
                <option key={s.sceneId} value={s.sceneId}>
                  {s.name || `المشهد ${s.sceneId.split('_').pop()}`}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}