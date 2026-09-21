// Local procedural 3D studio foundation.
// This does not call a cloud text-to-3D service. HIVAI generates the scene description
// and geometry recipe locally; a renderer can turn this into a Three.js scene.

export function generate3DAsset(prompt){
  const text=String(prompt).toLowerCase();
  const type=text.includes('robot')?'robot':text.includes('car')?'vehicle':text.includes('tree')?'tree':text.includes('house')?'building':'custom';
  const parts=type==='robot'
    ? [{shape:'box',name:'torso',scale:[1.2,1.6,.7]},{shape:'box',name:'head',scale:[.9,.8,.8]},{shape:'cylinder',name:'arm',scale:[.25,1,.25],count:2},{shape:'cylinder',name:'leg',scale:[.3,1.2,.3],count:2}]
    : [{shape:'box',name:'body',scale:[1.5,.8,2.4]},{shape:'sphere',name:'detail',scale:[.7,.7,.7]}];
  return {type, prompt, material:{baseColor:'#00eaff',roughness:.38,metalness:.72},parts,textures:['procedural-grid','noise-normal'],exportFormats:['glb','obj','gltf']};
}
