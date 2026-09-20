<?php
/**
 * Plugin Name: UGO GitHub Updater
 * Description: Actualiza el build React de UGO desde GitHub con verificación, backup y rollback.
 * Version: 1.0.0
 * Author: UGO
 */
if (!defined('ABSPATH')) exit;

const UGO_GH_REPO='sebastisnzoth/ugo-admin-panel';
const UGO_GH_TAG='wordpress-latest';
const UGO_GH_MANIFEST='ugo-build-manifest.json';
const UGO_GH_ZIP='ugo-wordpress-build.zip';
const UGO_GH_SHA='ugo-wordpress-build.zip.sha256';
const UGO_GH_RESULT='ugo_github_updater_last_result';

function ugo_gh_paths(){
  $u=wp_upload_dir(); $b=trailingslashit($u['basedir']).'ugo-app-build';
  return ['base'=>$b,'current'=>"$b/current",'backups'=>"$b/backups"];
}
function ugo_gh_headers($binary=false){
  $h=['Accept'=>$binary?'application/octet-stream':'application/vnd.github+json','User-Agent'=>'UGO-WordPress-Updater/1.0','X-GitHub-Api-Version'=>'2022-11-28'];
  if(defined('UGO_GITHUB_TOKEN')&&is_string(UGO_GITHUB_TOKEN)&&UGO_GITHUB_TOKEN!=='')$h['Authorization']='Bearer '.UGO_GITHUB_TOKEN;
  return $h;
}
function ugo_gh_get($url,$binary=false,$timeout=30,$stream=''){
  $a=['timeout'=>$timeout,'redirection'=>5,'headers'=>ugo_gh_headers($binary)];
  if($stream!==''){$a['stream']=true;$a['filename']=$stream;}
  $r=wp_remote_get($url,$a); if(is_wp_error($r))return $r;
  $c=(int)wp_remote_retrieve_response_code($r);
  if($c<200||$c>=300)return new WP_Error('ugo_gh_http','GitHub respondió HTTP '.$c.'.');
  return $stream!==''?$stream:wp_remote_retrieve_body($r);
}
function ugo_gh_release(){
  $b=ugo_gh_get('https://api.github.com/repos/'.UGO_GH_REPO.'/releases/tags/'.UGO_GH_TAG);
  if(is_wp_error($b))return $b; $j=json_decode($b,true);
  return is_array($j)&&!empty($j['assets'])?$j:new WP_Error('ugo_gh_release','La publicación de GitHub no contiene assets válidos.');
}
function ugo_gh_asset($release,$name){
  foreach($release['assets'] as $a)if(isset($a['name'])&&hash_equals($name,(string)$a['name']))return $a;
  return new WP_Error('ugo_gh_asset','Falta el asset requerido: '.$name);
}
function ugo_gh_asset_url($a){
  $private=defined('UGO_GITHUB_TOKEN')&&is_string(UGO_GITHUB_TOKEN)&&UGO_GITHUB_TOKEN!=='';
  return $private&&!empty($a['url'])?(string)$a['url']:(string)($a['browser_download_url']??'');
}
function ugo_gh_asset_body($a){$u=ugo_gh_asset_url($a);return $u===''?new WP_Error('ugo_gh_url','Asset sin URL.'):ugo_gh_get($u,true);}
function ugo_gh_manifest($release){
  $a=ugo_gh_asset($release,UGO_GH_MANIFEST); if(is_wp_error($a))return $a;
  $b=ugo_gh_asset_body($a); if(is_wp_error($b))return $b; $m=json_decode($b,true);
  return is_array($m)&&!empty($m['commit'])&&preg_match('/^[a-f0-9]{40}$/',(string)$m['commit'])?$m:new WP_Error('ugo_gh_manifest','Manifest remoto inválido.');
}
function ugo_gh_current(){
  $p=ugo_gh_paths();$f=$p['current'].'/'.UGO_GH_MANIFEST;
  if(!is_readable($f))return []; $m=json_decode((string)file_get_contents($f),true); return is_array($m)?$m:[];
}
function ugo_gh_rm($p){
  if(!file_exists($p))return true;if(is_file($p)||is_link($p))return @unlink($p);
  foreach(scandir($p)?:[] as $i)if($i!=='.'&&$i!=='..'&&!ugo_gh_rm($p.DIRECTORY_SEPARATOR.$i))return false;return @rmdir($p);
}
function ugo_gh_extract($zip,$to){
  if(!class_exists('ZipArchive'))return new WP_Error('ugo_gh_zip','El servidor no tiene ZipArchive.');
  $z=new ZipArchive();if($z->open($zip)!==true)return new WP_Error('ugo_gh_zip','No se pudo abrir el ZIP.');
  for($i=0;$i<$z->numFiles;$i++){$n=str_replace('\\','/',(string)$z->getNameIndex($i));if($n===''||str_starts_with($n,'/')||preg_match('#(^|/)\.\.(/|$)#',$n)){$z->close();return new WP_Error('ugo_gh_zip','ZIP con ruta no permitida.');}}
  if(!wp_mkdir_p($to)){$z->close();return new WP_Error('ugo_gh_dir','No se pudo crear staging.');}
  $ok=$z->extractTo($to);$z->close();return $ok?true:new WP_Error('ugo_gh_zip','No se pudo extraer el ZIP.');
}
function ugo_gh_trim(){
  $p=ugo_gh_paths();if(!is_dir($p['backups']))return;$a=array_values(array_filter(scandir($p['backups'])?:[],fn($x)=>$x!=='.'&&$x!=='..'&&is_dir($p['backups'].'/'.$x)));rsort($a,SORT_STRING);
  foreach(array_slice($a,3) as $x)ugo_gh_rm($p['backups'].'/'.$x);
}
function ugo_gh_install(){
  $r=ugo_gh_release();if(is_wp_error($r))return $r;$m=ugo_gh_manifest($r);if(is_wp_error($m))return $m;
  $za=ugo_gh_asset($r,UGO_GH_ZIP);$sa=ugo_gh_asset($r,UGO_GH_SHA);if(is_wp_error($za))return $za;if(is_wp_error($sa))return $sa;
  $sb=ugo_gh_asset_body($sa);if(is_wp_error($sb))return $sb;if(!preg_match('/\b([a-fA-F0-9]{64})\b/',$sb,$mm))return new WP_Error('ugo_gh_sha','Checksum remoto inválido.');
  $tmp=wp_tempnam(UGO_GH_ZIP);if(!$tmp)return new WP_Error('ugo_gh_tmp','No se pudo crear archivo temporal.');
  $u=ugo_gh_asset_url($za);$d=$u===''?new WP_Error('ugo_gh_url','ZIP sin URL.'):ugo_gh_get($u,true,120,$tmp);if(is_wp_error($d)){@unlink($tmp);return $d;}
  $actual=hash_file('sha256',$tmp);if(!$actual||!hash_equals(strtolower($mm[1]),strtolower($actual))){@unlink($tmp);return new WP_Error('ugo_gh_sha','Checksum del ZIP no coincide. No se instaló nada.');}
  $p=ugo_gh_paths();wp_mkdir_p($p['base']);wp_mkdir_p($p['backups']);$st=$p['base'].'/staging-'.wp_generate_password(10,false,false);
  $e=ugo_gh_extract($tmp,$st);@unlink($tmp);if(is_wp_error($e)){ugo_gh_rm($st);return $e;}
  $mf=$st.'/'.UGO_GH_MANIFEST;
  if(!is_readable($st.'/index.html')||!is_dir($st.'/assets')||!is_readable($mf)){ugo_gh_rm($st);return new WP_Error('ugo_gh_build','Build incompleto: faltan index.html, assets o manifest.');}
  $inside=json_decode((string)file_get_contents($mf),true);if(!is_array($inside)||empty($inside['commit'])||!hash_equals((string)$m['commit'],(string)$inside['commit'])){ugo_gh_rm($st);return new WP_Error('ugo_gh_commit','El commit del ZIP no coincide con el manifest.');}
  $old=ugo_gh_current();$backup='';
  if(is_dir($p['current'])){$short=!empty($old['commit'])?substr((string)$old['commit'],0,12):'unknown';$backup=$p['backups'].'/'.gmdate('Ymd-His').'-'.$short;if(!@rename($p['current'],$backup)){ugo_gh_rm($st);return new WP_Error('ugo_gh_backup','No se pudo crear backup; la versión actual quedó intacta.');}}
  if(!@rename($st,$p['current'])){if($backup!==''&&is_dir($backup)&&!is_dir($p['current']))@rename($backup,$p['current']);ugo_gh_rm($st);return new WP_Error('ugo_gh_swap','No se pudo activar el build; se intentó restaurar el anterior.');}
  ugo_gh_trim();return $m;
}
function ugo_gh_latest_backup(){
  $p=ugo_gh_paths();if(!is_dir($p['backups']))return '';$a=array_values(array_filter(scandir($p['backups'])?:[],fn($x)=>$x!=='.'&&$x!=='..'&&is_dir($p['backups'].'/'.$x)));rsort($a,SORT_STRING);return $a?$p['backups'].'/'.$a[0]:'';
}
function ugo_gh_rollback(){
  $p=ugo_gh_paths();$b=ugo_gh_latest_backup();if($b==='')return new WP_Error('ugo_gh_backup','No hay versión anterior.');$failed=$p['base'].'/rollback-replaced-'.gmdate('Ymd-His');
  if(is_dir($p['current'])&&!@rename($p['current'],$failed))return new WP_Error('ugo_gh_rollback','No se pudo apartar la versión actual.');
  if(!@rename($b,$p['current'])){if(is_dir($failed)&&!is_dir($p['current']))@rename($failed,$p['current']);return new WP_Error('ugo_gh_rollback','No se pudo restaurar el backup.');}
  if(is_dir($failed))@rename($failed,$p['backups'].'/'.basename($failed));return ugo_gh_current();
}
function ugo_gh_result($type,$message,$commit=''){update_option(UGO_GH_RESULT,['type'=>sanitize_key($type),'message'=>sanitize_text_field($message),'commit'=>sanitize_text_field($commit),'time'=>time()],false);}
function ugo_gh_admin_update(){
  if(!current_user_can('manage_options'))wp_die('Sin permisos.');check_admin_referer('ugo_github_update');$r=ugo_gh_install();
  is_wp_error($r)?ugo_gh_result('error',$r->get_error_message()):ugo_gh_result('success','UGO se actualizó desde GitHub y quedó activo.',(string)$r['commit']);wp_safe_redirect(admin_url('tools.php?page=ugo-github-updater'));exit;
}
function ugo_gh_admin_rollback(){
  if(!current_user_can('manage_options'))wp_die('Sin permisos.');check_admin_referer('ugo_github_rollback');$r=ugo_gh_rollback();
  is_wp_error($r)?ugo_gh_result('error',$r->get_error_message()):ugo_gh_result('success','Se restauró la versión anterior de UGO.',(string)($r['commit']??''));wp_safe_redirect(admin_url('tools.php?page=ugo-github-updater'));exit;
}
add_action('admin_post_ugo_github_update','ugo_gh_admin_update');add_action('admin_post_ugo_github_rollback','ugo_gh_admin_rollback');
add_action('admin_menu',function(){
  add_menu_page('UGO · Actualizaciones','UGO','manage_options','ugo-github-updater','ugo_gh_page','dashicons-update',3);
  add_submenu_page('ugo-github-updater','UGO · Actualizaciones','Actualizar desde GitHub','manage_options','ugo-github-updater','ugo_gh_page');
  add_management_page('UGO · Actualizaciones','UGO Actualizaciones','manage_options','ugo-github-updater','ugo_gh_page');
});
function ugo_gh_short($s){return $s?substr((string)$s,0,12):'sin registrar';}
function ugo_gh_page(){
  if(!current_user_can('manage_options'))return;$c=ugo_gh_current();$rel=ugo_gh_release();$rm=is_wp_error($rel)?$rel:ugo_gh_manifest($rel);$last=get_option(UGO_GH_RESULT,[]);$bk=ugo_gh_latest_backup();$cc=(string)($c['commit']??'');$rc=!is_wp_error($rm)?(string)($rm['commit']??''):'';$same=$cc!==''&&$rc!==''&&hash_equals($cc,$rc);?>
  <div class="wrap"><h1>UGO · Actualizaciones desde GitHub</h1><p>Repositorio <code><?php echo esc_html(UGO_GH_REPO);?></code> · rama <code>main</code>.</p>
  <?php if(!empty($last['message'])):?><div class="notice notice-<?php echo esc_attr(($last['type']??'')==='success'?'success':'error');?> is-dismissible"><p><?php echo esc_html($last['message']);?> <?php if(!empty($last['commit'])):?><code><?php echo esc_html(ugo_gh_short($last['commit']));?></code><?php endif;?></p></div><?php endif;?>
  <table class="widefat striped" style="max-width:900px;margin-top:20px"><tbody>
  <tr><th style="width:240px">Versión instalada</th><td><code><?php echo esc_html(ugo_gh_short($cc));?></code></td></tr>
  <tr><th>Versión disponible</th><td><?php if(is_wp_error($rm)):?><span style="color:#b32d2e"><?php echo esc_html($rm->get_error_message());?></span><?php else:?><code><?php echo esc_html(ugo_gh_short($rc));?></code><?php if($same):?><strong> · actualizada</strong><?php endif;?><?php endif;?></td></tr>
  <tr><th>Backup</th><td><?php echo $bk!==''?esc_html(basename($bk)):'Todavía no';?></td></tr><tr><th>Integridad</th><td>SHA-256 + manifest del commit antes de activar</td></tr></tbody></table>
  <div style="display:flex;gap:12px;margin-top:22px;flex-wrap:wrap"><?php if(!is_wp_error($rm)):?><form method="post" action="<?php echo esc_url(admin_url('admin-post.php'));?>"><input type="hidden" name="action" value="ugo_github_update"><?php wp_nonce_field('ugo_github_update');submit_button($same?'Reinstalar versión de GitHub':'Actualizar ahora','primary','submit',false);?></form><?php endif;?>
  <?php if($bk!==''):?><form method="post" action="<?php echo esc_url(admin_url('admin-post.php'));?>" onsubmit="return confirm('¿Restaurar la versión anterior de UGO?');"><input type="hidden" name="action" value="ugo_github_rollback"><?php wp_nonce_field('ugo_github_rollback');submit_button('Volver a versión anterior','secondary','submit',false);?></form><?php endif;?></div>
  <p style="margin-top:18px;max-width:900px">Descarga el build publicado por UGO, verifica SHA-256 y commit, extrae en staging, crea backup y recién entonces activa la nueva versión.</p></div><?php
}
