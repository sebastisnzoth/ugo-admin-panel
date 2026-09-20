<?php
/**
 * Plugin Name: UGO Landing Bridge
 * Description: Sirve la landing React de UGO como portada de WordPress usando el build publicado por GitHub Actions.
 * Version: 1.0.0
 * Author: UGO
 */

if (!defined('ABSPATH')) {
    exit;
}

function ugo_landing_bridge_is_home_request() {
    if (is_admin() || wp_doing_ajax()) {
        return false;
    }

    $request_path = isset($_SERVER['REQUEST_URI'])
        ? (string) parse_url(wp_unslash($_SERVER['REQUEST_URI']), PHP_URL_PATH)
        : '/';

    $home_path = (string) wp_parse_url(home_url('/'), PHP_URL_PATH);
    $request_path = '/' . trim($request_path, '/') . '/';
    $home_path = '/' . trim($home_path, '/') . '/';

    return $request_path === $home_path;
}

function ugo_landing_bridge_build_paths() {
    $uploads = wp_upload_dir();

    return array(
        'dir' => trailingslashit($uploads['basedir']) . 'ugo-app-build/current',
        'url' => trailingslashit($uploads['baseurl']) . 'ugo-app-build/current',
    );
}

function ugo_landing_bridge_asset_url($src, $base_url) {
    if (preg_match('#^https?://#i', $src)) {
        return $src;
    }

    $src = preg_replace('#^(?:\./|/)#', '', $src);
    return trailingslashit($base_url) . $src;
}

function ugo_landing_bridge_render() {
    if (!ugo_landing_bridge_is_home_request()) {
        return;
    }

    $paths = ugo_landing_bridge_build_paths();
    $index_path = trailingslashit($paths['dir']) . 'index.html';

    if (!is_readable($index_path)) {
        return;
    }

    $html = @file_get_contents($index_path);
    if (!$html) {
        return;
    }

    preg_match_all("/<link[^>]+rel=['\"]stylesheet['\"][^>]+href=['\"]([^'\"]+)['\"][^>]*>/i", $html, $styles);
    preg_match_all("/<script[^>]+type=['\"]module['\"][^>]+src=['\"]([^'\"]+)['\"][^>]*><\/script>/i", $html, $scripts);

    status_header(200);
    nocache_headers();

    header('Content-Type: text/html; charset=' . get_option('blog_charset', 'UTF-8'));

    echo '<!doctype html>';
    echo '<html lang="es">';
    echo '<head>';
    echo '<meta charset="' . esc_attr(get_option('blog_charset', 'UTF-8')) . '">';
    echo '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">';
    echo '<meta name="theme-color" content="#f4f7f5">';
    echo '<meta name="description" content="UGO conecta clientes con profesionales para servicios cerca de vos. Un pedido. Un profesional. Sin vueltas.">';
    echo '<title>UGO · Servicios cerca de vos</title>';

    if (!empty($styles[1])) {
        foreach ($styles[1] as $src) {
            $url = ugo_landing_bridge_asset_url($src, $paths['url']);
            echo '<link rel="stylesheet" href="' . esc_url($url) . '">';
        }
    }

    echo '</head>';
    echo '<body style="margin:0">';
    echo '<div id="root"></div>';

    if (!empty($scripts[1])) {
        foreach ($scripts[1] as $src) {
            $url = ugo_landing_bridge_asset_url($src, $paths['url']);
            echo '<script type="module" src="' . esc_url($url) . '"></script>';
        }
    }

    echo '</body>';
    echo '</html>';
    exit;
}

add_action('template_redirect', 'ugo_landing_bridge_render', 0);
