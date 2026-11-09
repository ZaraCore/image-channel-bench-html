let zoomImage=null,zoomFactor=1,viewerDrag=null;
function zoomTo(value,anchor=null){
 if(!zoomImage)return;const stage=$('zoomStage'),img=$('zoomImage');
 const before=anchor?img.getBoundingClientRect():null;
 const x=before?(anchor.x-before.left)/before.width:0,y=before?(anchor.y-before.top)/before.height:0;
 zoomFactor=value==='fit'?Math.min(1,(stage.clientWidth||800)/zoomImage.width,(stage.clientHeight||600)/zoomImage.height):Math.min(16,Math.max(.05,Number(value)||1));
 img.style.maxWidth='none';img.style.maxHeight='none';img.style.width=Math.max(1,Math.round(zoomImage.width*zoomFactor))+'px';img.style.height='auto';
 if(anchor&&before.width&&before.height){const after=img.getBoundingClientRect();stage.scrollLeft+=after.left+x*after.width-anchor.x;stage.scrollTop+=after.top+y*after.height-anchor.y;}
 $('zoomReadout').textContent=Math.round(zoomFactor*100)+'%';
 if(value==='fit')$('zoomScale').value='fit';else if(['0.5','1','2','4'].includes(String(value)))$('zoomScale').value=String(value);else $('zoomScale').value='custom';
}
function openImage(im){zoomImage=im;$('zoomImage').src=im.objectUrl;$('zoomImage').draggable=false;$('zoomLabel').textContent=im.name+' · '+im.width+' × '+im.height;document.body.classList.add('image-viewer-open');$('imageDialog').showModal();$('zoomStage').scrollLeft=0;$('zoomStage').scrollTop=0;zoomTo('fit');}
function viewerWheel(e){if(!zoomImage)return;e.preventDefault();e.stopPropagation();const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?$('zoomStage').clientHeight:1);zoomTo(zoomFactor*Math.exp(-Math.max(-500,Math.min(500,delta))*.0018),{x:e.clientX,y:e.clientY});}
$('zoomStage').addEventListener('wheel',viewerWheel,{passive:false});
$('imageDialog').addEventListener('wheel',e=>{if(zoomImage&&!$('zoomStage').contains(e.target))e.preventDefault();},{passive:false});
$('zoomStage').addEventListener('pointerdown',e=>{if(!zoomImage||e.button!==0)return;viewerDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:$('zoomStage').scrollLeft,top:$('zoomStage').scrollTop};$('zoomStage').setPointerCapture(e.pointerId);$('zoomStage').classList.add('dragging');e.preventDefault();});
$('zoomStage').addEventListener('pointermove',e=>{if(!viewerDrag||e.pointerId!==viewerDrag.id)return;$('zoomStage').scrollLeft=viewerDrag.left-(e.clientX-viewerDrag.x);$('zoomStage').scrollTop=viewerDrag.top-(e.clientY-viewerDrag.y);});
function endViewerDrag(){viewerDrag=null;$('zoomStage').classList.remove('dragging');}
for(const event of ['pointerup','pointercancel','lostpointercapture'])$('zoomStage').addEventListener(event,endViewerDrag);
$('zoomScale').onchange=()=>{if($('zoomScale').value!=='custom')zoomTo($('zoomScale').value);};$('closeImage').onclick=()=>$('imageDialog').close();
$('imageDialog').addEventListener('close',()=>{document.body.classList.remove('image-viewer-open');$('zoomImage').removeAttribute('src');zoomImage=null;endViewerDrag();});
