'use client';

import { useEffect, useRef, useState } from 'react';
import Marzipano from 'marzipano';
import projectData from '../public/data/final_project_data.json';

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

export default function MarzipanoViewer() {
  const viewerRef = useRef<HTMLDivElement>(null);

  // حالة نافذة التعديل والتحكم المتقدمة
  const [editingHotspot, setEditingHotspot] = useState<any>(null);
  const [availableIcons, setAvailableIcons] = useState<string[]>([]);
  const [currentSceneId, setCurrentSceneId] = useState<string>('');
  const hotspotElementsRef = useRef<Record<string, Record<string, HTMLElement>>>({});

  // تم استبدال [YOUR_BUCKET_NAME] باسم الـ Bucket الحقيقي
  const SUPABASE_STORAGE_URL = "https://ejvnmawlifhdytktdzer.supabase.co/storage/v1/object/public/tours/project_01/";

  // السماح بتعديل أماكن الأسهم فقط في بيئة التطوير (أثناء تشغيل npm run dev)
  const isEditMode = process.env.NODE_ENV === 'development';

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
    if (!viewerElement) return;

    const viewer = new Marzipano.Viewer(viewerElement);
    const scenes: Record<string, any> = {};
    hotspotElementsRef.current = {};

    projectData.scenes.forEach((sceneData) => {
      const imageUrl = `${SUPABASE_STORAGE_URL}${sceneData.sceneId}/base.webp`;
      console.log("رابط الصورة الذي يحاول الموقع تحميله:", imageUrl);
      const source = Marzipano.ImageUrlSource.fromString(imageUrl);
      const geometry = new Marzipano.EquirectGeometry([{ width: 8192 }]); 
      
      const view = new Marzipano.RectilinearView({
        yaw: sceneData.initialYaw ?? 0,
        pitch: sceneData.initialPitch ?? 0,
        fov: Math.PI / 4
      });

      const scene = viewer.createScene({
        source: source,
        geometry: geometry,
        view: view
      });

      scenes[sceneData.sceneId] = { scene, data: sceneData };
    });

    projectData.scenes.forEach((sceneData) => {
      const currentSceneObj = scenes[sceneData.sceneId].scene;
      if (!hotspotElementsRef.current[sceneData.sceneId]) hotspotElementsRef.current[sceneData.sceneId] = {};
      
      sceneData.hotspots.forEach((hotspot: any) => {
        // الحاوية الأساسية (لإحداثيات Marzipano)
        const hotspotWrapper = document.createElement('div');
        
        // العنصر المرئي (للتصميم والحركة)
        const hotspotVisual = document.createElement('div');
        
        // قراءة نوع النقطة من ملف JSON، وإذا لم نحدد لها نوع نستخدم الرادار الأرضي كافتراضي
        const type = hotspot.type || 'ground-radar';
        const opacity = hotspot.opacity !== undefined ? hotspot.opacity : 1;
        const label = hotspot.label || '';
        
        hotspotVisual.className = 'hotspot-visual';
        hotspotVisual.style.cursor = isEditMode ? 'grab' : 'pointer';
        hotspotVisual.title = label; // ضمان ظهور اسم الغرفة (Native Tooltip) كحل احتياطي قوي

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
              }
            };
  
            const onMouseUp = (upEvent: MouseEvent) => {
              viewer.controls().enable();
              window.removeEventListener('mousemove', onMouseMove);
              window.removeEventListener('mouseup', onMouseUp);
              hotspotVisual.style.cursor = 'grab';
              
              if (isDragging) {
                const view = viewer.view();
                if (!view) return;
                const rect = viewerElement.getBoundingClientRect();
                const coords = view.screenToCoordinates({ x: upEvent.clientX - rect.left, y: upEvent.clientY - rect.top });
                if (coords) {
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
      const firstSceneId = projectData.scenes[0].sceneId;
      scenes[firstSceneId].scene.switchTo();
      setCurrentSceneId(firstSceneId);
    }

    return () => {
      viewer.destroy();
    };
  }, []);

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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#141414' }}>
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
          transform: translate(-50%, -50%);
          transition: transform 0.2s ease-in-out;
        }
        .hotspot-visual:hover {
          transform: translate(-50%, -50%) scale(1.15);
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
      `}</style>
      
      {/* --- لوحة المستكشف الجانبية (لحل مشكلة اختفاء النقاط) --- */}
      {isEditMode && currentSceneId && (
        <div style={{ position: 'absolute', top: 20, right: 20, width: 280, background: 'rgba(20,20,20,0.95)', padding: '16px', borderRadius: '12px', color: 'white', zIndex: 1000, border: '1px solid #333', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', fontFamily: 'system-ui, sans-serif' }}>
          <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '16px', borderBottom: '1px solid #444', paddingBottom: '8px' }}>📍 إدارة نقاط المشهد الحالي</h3>
          {projectData.scenes.find(s => s.sceneId === currentSceneId)?.hotspots.map((hs: any, idx: number) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', background: '#2a2a2a', padding: '10px', borderRadius: '6px', border: '1px solid #444' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>وجهة: {hs.targetSceneId.split('_').pop()}</span>
                <span style={{ fontSize: '11px', color: '#aaa' }}>{hs.label || 'بدون اسم'}</span>
              </div>
              <button 
                onClick={() => {
                  const visualElement = hotspotElementsRef.current[currentSceneId]?.[hs.targetSceneId];
                  setEditingHotspot({
                    sourceSceneId: currentSceneId,
                    targetSceneId: hs.targetSceneId,
                    type: hs.type || 'ground-radar',
                    customImageUrl: hs.customImageUrl || '',
                    opacity: hs.opacity !== undefined ? hs.opacity : 1,
                    label: hs.label || '',
                    domElement: visualElement,
                    originalHotspotRef: hs
                  });
                }}
                style={{ background: '#0078ff', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
              >تعديل</button>
            </div>
          ))}
        </div>
      )}

      {/* --- واجهة تحكم متقدمة لتخصيص النقطة التفاعلية تظهر فقط عند النقر الأيمن --- */}
      {isEditMode && editingHotspot && (
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
                  المشهد {s.sceneId.split('_').pop()}
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