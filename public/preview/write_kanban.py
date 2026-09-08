#!/usr/bin/env python3
# Generate kanban.html - writes in chunks to avoid memory issues
import os

OUT = r"C:\Users\nayar\iCloudDrive\iCloud~md~obsidian\DEV-DOCS\CLAUDE DOCS LAND\PULSO\public\preview\kanban.html"

def w(text):
    with open(OUT, 'a', encoding='utf-8') as f:
        f.write(text)

# Clear file
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('')

# ===== CSS =====
w('''<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Plano de Ação — PULSO</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
<style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#F7F6F3;--surface:#FFFFFF;--surface-hover:#F5F4F1;--primary:#1B4332;--primary-light:#2D6A4F;--accent:#74C69D;--accent-dim:#D8F3DC;--text:#1C1917;--text-muted:#78716C;--text-faint:#A8A29E;--border:#E7E5E4;--border-strong:#D6D3D1;--danger:#DC2626;--warning:#D97706;--success:#16A34A;--info:#3B82F6;--shadow-sm:0 1px 2px rgba(0,0,0,0.06);--shadow:0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04);--shadow-lg:0 4px 12px rgba(0,0,0,0.10);--radius:8px;--radius-sm:5px;--sidebar-w:240px;--header-h:52px;--font-body:'Plus Jakarta Sans',system-ui,sans-serif;--font-heading:'DM Sans',system-ui,sans-serif}
    @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111110;--surface:#1C1C1A;--surface-hover:#242422;--text:#F5F5F4;--text-muted:#A8A29E;--text-faint:#78716C;--border:#2E2E2C;--border-strong:#3D3D3B;--accent-dim:#1B4332}}
    :root[data-theme="dark"]{--bg:#111110;--surface:#1C1C1A;--surface-hover:#242422;--text:#F5F5F4;--text-muted:#A8A29E;--text-faint:#78716C;--border:#2E2E2C;--border-strong:#3D3D3B;--accent-dim:#1B4332}
    html,body{height:100%}
    body{font-family:var(--font-body);background:var(--bg);color:var(--text);line-height:1.5;font-size:14px;height:100vh;overflow:hidden;display:flex}
    button{font-family:var(--font-body);font-size:inherit;line-height:inherit;color:var(--text);background:transparent;border:none;cursor:pointer;padding:0;margin:0;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;min-height:0}
    button:active{transform:scale(0.98)}
    button:focus{outline:none}
    button:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
    .sidebar{width:var(--sidebar-w);background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;height:100vh;overflow:hidden}
    .sidebar-header{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
    .workspace-btn{display:flex;align-items:center;gap:8px;background:none;border:none;cursor:pointer;padding:6px 8px;border-radius:var(--radius-sm);color:var(--text);font-size:14px;font-weight:600;width:100%;min-height:36px;text-align:left}
    .workspace-btn:hover{background:var(--surface-hover)}
    .workspace-avatar{width:26px;height:26px;background:var(--primary);border-radius:6px;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;flex-shrink:0}
    .workspace-name{flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .workspace-chevron{color:var(--text-faint);font-size:12px;transition:transform 0.2s}
    .workspace-btn.open .workspace-chevron{transform:rotate(180deg)}
    .sidebar-nav{flex:1;overflow-y:auto;padding:6px 8px}
    .sidebar-section-label{font-size:11px;font-weight:600;color:var(--text-faint);text-transform:uppercase;letter-spacing:0.06em;padding:10px 8px 4px}
    .sidebar-item{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:var(--radius-sm);cursor:pointer;color:var(--text-muted);font-size:13.5px;transition:background 0.12s,color 0.12s;border:none;background:none;width:100%;text-align:left;min-height:32px}
    .sidebar-item:hover{background:var(--surface-hover);color:var(--text)}
    .sidebar-item.active{background:var(--accent-dim);color:var(--primary);font-weight:500}
    .sidebar-item .icon{font-size:15px;flex-shrink:0;width:18px;text-align:center}
    .sidebar-item .label{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .sidebar-item .count{font-size:11px;color:var(--text-faint);background:var(--surface-hover);padding:1px 6px;border-radius:10px}
    .sidebar-item.active .count{background:var(--surface)}
    .sidebar-divider{height:1px;background:var(--border);margin:6px 8px}
    .new-base-btn{display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:var(--radius-sm);cursor:pointer;color:var(--text-muted);font-size:13.5px;transition:background 0.12s,color 0.12s;border:none;background:none;width:100%;text-align:left;min-height:32px}
    .new-base-btn:hover{background:var(--surface-hover);color:var(--text)}
    .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;position:relative}
    .header{height:var(--header-h);background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 14px;gap:10px;flex-shrink:0}
    .base-title{font-family:var(--font-heading);font-size:15px;font-weight:700;display:flex;align-items:center;gap:8px}
    .base-title-icon{width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:12px}
    .header-spacer{flex:1}
    .search-box{display:flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:5px 10px;font-size:13px;color:var(--text-faint);width:200px;cursor:text;transition:border-color 0.15s,width 0.2s}
    .search-box:focus-within{border-color:var(--accent);width:260px}
    .search-box input{background:none;border:none;outline:none;font-size:13px;color:var(--text);width:100%}
    .search-box input::placeholder{color:var(--text-faint)}
    .header-actions{display:flex;align-items:center;gap:4px}
    .icon-btn{width:32px;height:32px;min-width:32px;border-radius:var(--radius-sm);border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:15px;transition:background 0.12s,color 0.12s;padding:0}
    .icon-btn:hover{background:var(--surface-hover);color:var(--text)}
    .btn-text-primary{height:32px;padding:0 12px;border-radius:var(--radius-sm);border:none;background:var(--primary);color:white;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:13px;font-weight:500;transition:background 0.12s}
    .btn-text-primary:hover{background:var(--primary-light)}
    .view-tabs{display:flex;align-items:center;gap:2px;padding:0 14px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0}
    .view-tab{padding:9px 14px;font-size:13px;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:color 0.12s,border-color 0.12s;white-space:nowrap;display:flex;align-items:center;gap:6px;background:none;border-top:none;border-left:none;border-right:none}
    .view-tab:hover{color:var(--text)}
    .view-tab.active{color:var(--primary);border-bottom-color:var(--primary);font-weight:600}
    .view-tab .emoji{font-size:14px}
    .toolbar{display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--surface);border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap}
    .toolbar-right{margin-left:auto;display:flex;align-items:center;gap:4px}
    .chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--surface-hover);border:1px solid var(--border);border-radius:20px;font-size:12px;color:var(--text-muted);cursor:pointer;transition:background 0.12s,border-color 0.12s,color 0.12s;white-space:nowrap;min-height:24px}
    .chip:hover{border-color:var(--border-strong)}
    .chip.active{background:var(--accent-dim);border-color:var(--accent);color:var(--primary)}
    .divider-v{width:1px;height:18px;background:var(--border);flex-shrink:0;margin:0 4px}
    .content{flex:1;overflow-y:auto;padding:14px;background:var(--bg)}
    .kanban{display:flex;gap:12px;align-items:flex-start;min-height:calc(100vh - 200px)}
    .kanban.hidden{display:none}
    .kanban-col{width:280px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;background:transparent;padding:6px;border-radius:var(--radius);transition:background 0.15s,outline 0.15s}
    .kanban-col.drag-over{background:var(--accent-dim);outline:2px dashed var(--accent);outline-offset:-2px}
    .kanban-col-header{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius)}
    .kanban-col-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .kanban-col-name{font-size:13px;font-weight:600;color:var(--text);flex:1}
    .kanban-col-count{font-size:11px;color:var(--text-faint);background:var(--bg);padding:1px 7px;border-radius:10px;min-width:18px;text-align:center}
    .kanban-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:10px 12px;cursor:pointer;transition:box-shadow 0.15s,transform 0.1s,opacity 0.15s;display:flex;flex-direction:column;gap:8px;user-select:none;position:relative}
    .kanban-card:hover{box-shadow:var(--shadow-lg);transform:translateY(-1px);border-color:var(--border-strong)}
    .kanban-card.dragging{opacity:0.4;cursor:grabbing}
    .kanban-card-title{font-size:13px;font-weight:500;color:var(--text);line-height:1.4;word-wrap:break-word}
    .kanban-card-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
    .badge{display:inline-flex;align-items:center;gap:3px;font-size:11px;padding:2px 7px;border-radius:10px;font-weight:500;line-height:1.4}
    .badge-high{background:#FEE2E2;color:#991B1B}
    .badge-medium{background:#FEF3C7;color:#92400E}
    .badge-low{background:#DCFCE7;color:#166534}
    .badge-tag{background:var(--surface-hover);color:var(--text-muted);border:1px solid var(--border)}
    .badge-person{background:var(--accent-dim);color:var(--primary)}
    .kanban-card-footer{display:flex;align-items:center;justify-content:space-between;padding-top:6px;border-top:1px solid var(--border);margin-top:2px}
    .kanban-date{font-size:11px;color:var(--text-faint)}
    .kanban-date.overdue{color:var(--danger);font-weight:600}
    .kanban-date.done{color:var(--success)}
    .kanban-person{width:22px;height:22px;border-radius:50%;background:var(--primary);color:white;font-size:10px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .kanban-subtasks{display:inline-flex;align-items:center;gap:4px;font-size:11px;color:var(--text-faint)}
    .kanban-dependency{display:inline-flex;align-items:center;gap:3px;font-size:10px;color:var(--warning);background:#FEF3C7;padding:1px 6px;border-radius:6px;font-weight:500}
    .kanban-add-card{width:100%;padding:8px;background:none;border:1px dashed var(--border-strong);border-radius:var(--radius);color:var(--text-faint);font-size:12.5px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:4px;transition:background 0.12s,border-color 0.12s,color 0.12s;min-height:32px}
    .kanban-add-card:hover{border-color:var(--accent);color:var(--primary);background:var(--accent-dim)}
    .table-view{display:none}
    .table-view.active{display:block}
    .table-full{width:100%;border-collapse:collapse;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);overflow:hidden}
    .table-full th{text-align:left;padding:8px 12px;font-size:12px;font-weight:600;color:var(--text-muted);border-bottom:1px solid var(--border);background:var(--surface-hover);white-space:nowrap}
    .table-full td{padding:10px 12px;font-size:13px;border-bottom:1px solid var(--border);vertical-align:middle}
    .table-full tr:last-child td{border-bottom:none}
    .table-full tr{cursor:pointer;transition:background 0.1s}
    .table-full tr:hover td{background:var(--surface-hover)}
    .status-badge{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:3px 9px;border-radius:20px;font-weight:500;line-height:1.4}
    .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:100;opacity:0;pointer-events:none;transition:opacity 0.2s}
    .modal-overlay.open{opacity:1;pointer-events:all}
    .modal{background:var(--surface);border-radius:var(--radius);box-shadow:var(--shadow-lg);max-height:85vh;display:flex;flex-direction:column;transform:scale(0.96);transition:transform 0.2s;width:720px;max-width:calc(100vw - 32px)}
    .modal-overlay.open .modal{transform:scale(1)}
    .modal-header{padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--surface);z-index:3;flex-shrink:0}
    .modal-title{font-family:var(--font-heading);font-size:15px;font-weight:700;flex:1}
    .modal-body{padding:18px;overflow-y:auto;flex:1}
    .modal-footer{padding:12px 18px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px;position:sticky;bottom:0;background:var(--surface);z-index:2}
    .modal-close{width:28px;height:28px;min-width:28px;border-radius:6px;border:none;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:16px;padding:0}
    .modal-close:hover{background:var(--surface-hover);color:var(--text)}
    .card-title-input{width:100%;border:none;outline:none;font-family:var(--font-heading);font-size:22px;font-weight:700;color:var(--text);background:transparent;padding:8px 0;margin-bottom:16px}
    .card-title-input::placeholder{color:var(--text-faint)}
    .card-title-input:focus{background:var(--bg);border-radius:var(--radius-sm);padding-left:8px}
    .prop-grid{display:grid;grid-template-columns:130px 1fr;gap:10px 14px;align-items:center;margin-bottom:18px;padding-bottom:18px;border-bottom:1px solid var(--border)}
    .prop-label{font-size:12px;font-weight:600;color:var(--text-muted);display:flex;align-items:center;gap:6px}
    .prop-input,.prop-select,.prop-textarea{width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:13px;color:var(--text);background:var(--surface);outline:none;font-family:var(--font-body);transition:border-color 0.15s}
    .prop-input:focus,.prop-select:focus,.prop-textarea:focus{border-color:var(--accent)}
    .prop-textarea{resize:vertical;min-height:64px;line-height:1.5}
    .prop-select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A8A29E' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center;padding-right:28px}
    .section-title{font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;display:flex;align-items:center;gap:6px}
    .subtask-list{display:flex;flex-direction:column;gap:4px;margin-bottom:18px}
    .subtask-row{display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:var(--radius-sm);transition:background 0.1s}
    .subtask-row:hover{background:var(--surface-hover)}
    .subtask-checkbox{width:16px;height:16px;border:1.5px solid var(--border-strong);border-radius:4px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:11px;color:white;background:var(--surface)}
    .subtask-checkbox.checked{background:var(--primary);border-color:var(--primary)}
    .subtask-text{flex:1;font-size:13px;color:var(--text);background:none;border:none;outline:none;font-family:var(--font-body);padding:2px 0}
    .subtask-text.done{text-decoration:line-through;color:var(--text-faint)}
    .subtask-remove{color:var(--text-faint);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;opacity:0;transition:opacity 0.12s,background 0.12s}
    .subtask-row:hover .subtask-remove{opacity:1}
    .subtask-remove:hover{background:#FEE2E2;color:var(--danger)}
    .add-subtask{display:flex;align-items:center;gap:6px;padding:6px 8px;color:var(--text-faint);cursor:pointer;font-size:12.5px;border-radius:var(--radius-sm);width:100%;background:none;border:none;text-align:left;transition:background 0.12s,color 0.12s}
    .add-subtask:hover{background:var(--surface-hover);color:var(--text)}
    .comments-list{display:flex;flex-direction:column;gap:10px;margin-bottom:12px}
    .comment-row{display:flex;gap:8px;padding:8px;border-radius:var(--radius-sm);background:var(--bg)}
    .comment-avatar{width:26px;height:26px;border-radius:50%;background:var(--primary);color:white;font-size:11px;font-weight:600;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .comment-body{flex:1;min-width:0}
    .comment-meta{display:flex;align-items:baseline;gap:6px;font-size:12px;color:var(--text-faint);margin-bottom:2px}
    .comment-meta strong{color:var(--text);font-weight:600;font-size:13px}
    .comment-text{font-size:13px;color:var(--text);line-height:1.5}
    .add-comment{display:flex;gap:8px;padding:8px;background:var(--bg);border-radius:var(--radius-sm)}
    .add-comment textarea{flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-sm);padding:6px 10px;font-family:var(--font-body);font-size:13px;color:var(--text);outline:none;resize:vertical;min-height:36px}
    .add-comment textarea:focus{border-color:var(--accent)}
    .btn{padding:7px 14px;border-radius:var(--radius-sm);font-size:13px;font-weight:500;cursor:pointer;transition:background 0.12s;border:none;min-height:32px;display:inline-flex;align-items:center;justify-content:center;gap:4px;color:var(--text)}
    .btn-ghost{background:none;color:var(--text-muted);border:1px solid var(--border)}
    .btn-ghost:hover{background:var(--surface-hover);color:var(--text)}
    .btn-primary{background:var(--primary);color:white}
    .btn-primary:hover{background:var(--primary-light)}
    .btn-danger{background:var(--danger);color:white}
    .btn-danger:hover{background:#B91C1C}
    .config-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.15);z-index:90;opacity:0;pointer-events:none;transition:opacity 0.25s}
    .config-overlay.open{opacity:1;pointer-events:all}
    .config-panel{position:fixed;top:0;right:0;bottom:0;width:360px;max-width:100vw;background:var(--surface);border-left:1px solid var(--border);box-shadow:-4px 0 12px rgba(0,0,0,0.08);z-index:95;transform:translateX(100%);transition:transform 0.25s ease;display:flex;flex-direction:column}
    .config-panel.open{transform:translateX(0)}
    .config-header{padding:14px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;flex-shrink:0}
    .config-title{font-family:var(--font-heading);font-size:15px;font-weight:700;flex:1}
    .config-tabs{display:flex;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
    .config-tab{padding:10px 12px;font-size:12.5px;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;background:none;border-top:none;border-left:none;border-right:none;white-space:nowrap;transition:color 0.12s,border-color 0.12s;font-weight:500}
    .config-tab:hover{color:var(--text)}
    .config-tab.active{color:var(--primary);border-bottom-color:var(--primary);font-weight:600}
    .config-body{flex:1;overflow-y:auto;padding:16px}
    .config-section{display:none}
    .config-section.active{display:block}
    .config-section h4{font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
    .config-section p{font-size:12.5px;color:var(--text-muted);line-height:1.5;margin-bottom:12px}
    .icon-picker{display:grid;grid-template-columns:repeat(8,1fr);gap:4px;margin-bottom:16px}
    .icon-option{width:34px;height:34px;min-width:34px;border-radius:6px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-size:17px;display:flex;align-items:center;justify-content:center;transition:background 0.12s,border-color 0.12s;padding:0}
    .icon-option:hover{background:var(--surface-hover);border-color:var(--border-strong)}
    .icon-option.selected{background:var(--accent-dim);border-color:var(--accent)}
    .color-picker{display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap}
    .color-option{width:24px;height:24px;border-radius:50%;border:2px solid transparent;cursor:pointer;transition:transform 0.12s}
    .color-option:hover{transform:scale(1.15)}
    .color-option.selected{border-color:var(--text)}
    .prop-reorder-list{display:flex;flex-direction:column;gap:4px;margin-bottom:12px}
    .prop-reorder-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface-hover);border:1px solid var(--border);border-radius:var(--radius-sm);cursor:grab;user-select:none}
    .prop-reorder-item.dragging-prop{opacity:0.4}
    .prop-reorder-item.drag-over-prop{border-color:var(--accent);border-style:dashed}
    .prop-reorder-handle{color:var(--text-faint);font-size:14px;cursor:grab}
    .prop-reorder-icon{font-size:13px;color:var(--text-muted);width:18px;text-align:center}
    .prop-reorder-name{flex:1;font-size:13px}
    .prop-reorder-vis{background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:14px;padding:2px 4px;border-radius:4px}
    .prop-reorder-vis:hover{background:var(--surface)}
    .toggle-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)}
    .toggle-row:last-child{border-bottom:none}
    .toggle-label{flex:1;font-size:13px}
    .toggle-switch{width:36px;height:20px;background:var(--border-strong);border-radius:10px;position:relative;cursor:pointer;transition:background 0.15s;flex-shrink:0}
    .toggle-switch::after{content:'';position:absolute;width:16px;height:16px;background:white;border-radius:50%;top:2px;left:2px;transition:transform 0.15s}
    .toggle-switch.on{background:var(--primary)}
    .toggle-switch.on::after{transform:translateX(16px)}
    .prop-type-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px}
    .prop-type-btn{display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 4px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);cursor:pointer;transition:all 0.12s;color:var(--text-muted)}
    .prop-type-btn:hover{border-color:var(--accent);background:var(--surface-hover)}
    .prop-type-btn.selected{border-color:var(--primary);background:var(--accent-dim);color:var(--primary)}
    .prop-type-icon{font-size:18px;line-height:1}
    .prop-type-label{font-size:10px;font-weight:500;text-align:center}
    .col-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg);margin-bottom:6px}
    .col-item-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .col-item-name{flex:1;font-size:13px}
    .col-item-actions{display:flex;gap:4px}
    .col-item-btn{background:none;border:none;cursor:pointer;color:var(--text-faint);font-size:14px;padding:2px 4px;border-radius:4px;transition:all 0.12s}
    .col-item-btn:hover{background:var(--surface-hover);color:var(--text)}
    .col-item-btn.delete:hover{background:#FEE2E2;color:var(--danger)}
    .filter-builder{display:flex;flex-direction:column;gap:8px}
    .filter-group{background:var(--bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px}
    .filter-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:4px 0}
    .filter-logic{font-size:11px;font-weight:700;color:var(--primary);padding:2px 7px;background:var(--accent-dim);border-radius:4px;flex-shrink:0}
    .filter-select{padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12.5px;background:var(--surface);color:var(--text);appearance:none;font-family:var(--font-body)}
    .filter-input{padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);font-size:12.5px;background:var(--surface);color:var(--text);outline:none;min-width:110px;font-family:var(--font-body)}
    .filter-input:focus{border-color:var(--accent)}
    .filter-remove{color:var(--danger);cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;background:none;border:none;margin-left:auto}
    .filter-remove:hover{background:#FEE2E2}
    .filter-add-btn{display:flex;align-items:center;gap:4px;padding:6px 10px;border:1px dashed var(--border-strong);border-radius:var(--radius-sm);background:none;cursor:pointer;font-size:12px;color:var(--text-muted);transition:all 0.12s;font-family:var(--font-body)}
    .filter-add-btn:hover{border-color:var(--accent);color:var(--primary);background:var(--accent-dim)}
    .color-rule{display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--surface-hover);border-radius:var(--radius-sm);margin-bottom:6px}
    .color-rule-prop{font-size:12.5px;font-weight:500;min-width:80px}
    .color-rule-select{flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);font-size:12.5px;font-family:var(--font-body)}
    .color-rule-swatch{width:24px;height:24px;border-radius:6px;cursor:pointer;border:2px solid transparent}
    .color-rule-swatch.selected{border-color:var(--text)}
    .color-rule-remove{color:var(--danger);cursor:pointer;background:none;border:none;font-size:14px;padding:2px 4px}
    .theme-toggle{position:fixed;bottom:16px;right:16px;z-index:200;display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:6px 12px 6px 10px;box-shadow:var(--shadow);font-size:12px;color:var(--text-muted);cursor:pointer;transition:box-shadow 0.15s}
    .theme-toggle:hover{box-shadow:var(--shadow-lg)}
    .theme-icon{font-size:14px}
    ::-webkit-scrollbar{width:6px;height:6px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:3px}
    ::-webkit-scrollbar-thumb:hover{background:var(--text-faint)}
    .empty-col{padding:18px 8px;text-align:center;font-size:12px;color:var(--text-faint);border:1px dashed var(--border);border-radius:var(--radius)}
    .filter-chip{padding:3px 8px;border-radius:12px;font-size:11px;background:var(--accent-dim);color:var(--primary);display:flex;align-items:center;gap:4px;cursor:pointer;transition:background 0.12s}
    .filter-chip:hover{background:var(--accent)}
    .filter-chip .filter-chip-remove{font-size:13px;line-height:1;padding:0 2px}
    .filter-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
</style>
''')

# ===== SIDEBAR =====
w('''
<!-- SIDEBAR -->
<aside class="sidebar">
  <div class="sidebar-header">
    <button class="workspace-btn" id="workspaceBtn">
      <div class="workspace-avatar">LG</div>
      <span class="workspace-name">Land Grow</span>
      <span class="workspace-chevron" id="workspaceChevron">&#9662;</span>
    </button>
  </div>
  <nav class="sidebar-nav">
    <div class="sidebar-section-label">Espaço de trabalho</div>
    <button class="sidebar-item" data-nav="painel"><span class="icon">&#127968;</span><span class="label">Painel</span></button>
    <button class="sidebar-item" data-nav="inteligencia"><span class="icon">&#129504;</span><span class="label">Centro de Inteligência</span></button>
    <button class="sidebar-item active" data-nav="clientes"><span class="icon">&#128101;</span><span class="label">Clientes</span><span class="count">3</span></button>
    <div class="sidebar-divider"></div>
    <div class="sidebar-section-label">Rituais</div>
    <div class="sidebar-sub-items">
      <button class="sidebar-item" data-nav="standup"><span class="icon">&#128197;</span><span class="label">Daily Standup</span></button>
      <button class="sidebar-item" data-nav="weekly"><span class="icon">&#128200;</span><span class="label">Weekly Review</span></button>
      <button class="sidebar-item" data-nav="resultado"><span class="icon">&#127919;</span><span class="label">Sessão de Resultado</span></button>
    </div>
    <div class="sidebar-divider"></div>
    <button class="sidebar-item" data-nav="automacoes"><span class="icon">&#9889;</span><span class="label">Automações</span></button>
    <button class="sidebar-item" data-nav="permissoes"><span class="icon">&#128274;</span><span class="label">Permissões</span></button>
    <div class="sidebar-divider"></div>
    <button class="new-base-btn" id="newBaseBtn"><span class="icon">+</span><span class="label">Nova base</span></button>
  </nav>
</aside>

<!-- MAIN -->
<main class="main">
  <header class="header">
    <div class="base-title">
      <div class="base-title-icon" id="baseIcon" style="background:#74C69D">&#128203;</div>
      <span>Plano de Ação</span>
    </div>
    <div class="header-spacer"></div>
    <div class="search-box">
      <span>&#128269;</span>
      <input type="text" id="searchInput" placeholder="Buscar nesta base...">
    </div>
    <div class="header-actions">
      <button class="icon-btn" id="configBtn" title="Configurações"><span>&#9881;</span></button>
      <button class="btn-text-primary" id="newBtn"><span style="font-size:15px;line-height:1">+</span><span>Nova</span></button>
    </div>
  </header>

  <!-- View tabs -->
  <div class="view-tabs">
    <button class="view-tab active" data-view="kanban"><span class="emoji">&#128202;</span> Kanban</button>
    <button class="view-tab" data-view="table"><span class="emoji">&#9638;</span> Tabela</button>
  </div>

  <!-- Toolbar - minimal, only filter chips + filter dropdown -->
  <div class="toolbar">
    <button class="chip" id="filterBtn">&#128269; Filtrar</button>
    <div class="divider-v"></div>
    <div class="filter-tags" id="filterTags"></div>
    <div class="toolbar-right">
      <!-- Config panel grouping chips (read-only display) -->
      <span id="groupingLabel" style="font-size:12px;color:var(--text-faint);display:none">Agrupado por: </span>
    </div>
  </div>

  <!-- Content -->
  <div class="content">
    <div class="kanban" id="kanbanView"></div>
    <div class="table-view" id="tableView">
      <table class="table-full" id="mainTable">
        <thead id="tableHead"></thead>
        <tbody id="tableBody"></tbody>
      </table>
    </div>
  </div>
</main>

<!-- Card editor modal -->
<div class="modal-overlay" id="cardModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Editar tarefa</span>
      <button class="modal-close" id="closeCardBtn">&#10005;</button>
    </div>
    <div class="modal-body">
      <input type="text" class="card-title-input" id="cardTitle" placeholder="Título da tarefa...">
      <div class="prop-grid">
        <label class="prop-label">Status</label>
        <select class="prop-select" id="cardStatus">
          <option value="A Fazer">A Fazer</option>
          <option value="&#128308; Em Andamento">&#128308; Em Andamento</option>
          <option value="&#128992; Revisão">&#128992; Revisão</option>
          <option value="&#9989; Concluído">&#9989; Concluído</option>
          <option value="&#10060; Cancelado">&#10060; Cancelado</option>
        </select>
        <label class="prop-label">Prioridade</label>
        <select class="prop-select" id="cardPrioridade">
          <option value="Alta">&#128293; Alta</option>
          <option value="Média">&#128993; Média</option>
          <option value="Baixa">&#129001; Baixa</option>
        </select>
        <label class="prop-label">Responsável</label>
        <select class="prop-select" id="cardResponsavel">
          <option value="">—</option>
          <option value="NAYARA">NAYARA</option>
          <option value="CLIENTE">CLIENTE</option>
          <option value="CANDIDO">CANDIDO</option>
        </select>
        <label class="prop-label">Setor</label>
        <select class="prop-select" id="cardSetor">
          <option value="">—</option>
          <option>Operacional</option><option>RH</option><option>Financeiro</option><option>Marketing</option>
          <option>Administrativo</option><option>Estratégico</option><option>Vendas</option><option>Inovação</option>
          <option>Jurídico</option><option>Liderança</option>
        </select>
        <label class="prop-label">Prazo</label>
        <input type="date" class="prop-input" id="cardPrazo">
        <label class="prop-label">Urgência</label>
        <select class="prop-select" id="cardUrgencia">
          <option value="Sem prioridade">Sem prioridade</option>
          <option value="Alta">Alta</option><option value="Média">Média</option><option value="Baixa">Baixa</option>
        </select>
        <label class="prop-label">Estimativa (h)</label>
        <input type="number" min="0" class="prop-input" id="cardEstimativa" placeholder="0">
        <label class="prop-label">Cliente</label>
        <select class="prop-select" id="cardCliente">
          <option value="">— Nenhum —</option>
          <option>JS Construtora (Jefferson)</option>
          <option>RS Company (Lavínia + Ederson)</option>
          <option>Ontech TI (Renato)</option>
        </select>
      </div>
      <label class="section-title">&#128203; Campos personalizados</label>
      <div id="customFieldsSection" style="margin-bottom:12px"></div>
      <label class="section-title">&#128221; Observações</label>
      <textarea class="prop-textarea" id="cardObservacoes" placeholder="Detalhes, contexto, links..." style="margin-bottom:18px"></textarea>
      <label class="section-title">&#9745; Subtarefas <span id="subtaskProgress" style="color:var(--text-faint);font-weight:500;text-transform:none;letter-spacing:0">(0/0)</span></label>
      <div class="subtask-list" id="subtaskList"></div>
      <button class="add-subtask" id="addSubtaskBtn">+ Adicionar subtarefa</button>
      <label class="section-title" style="margin-top:16px">&#128172; Comentários</label>
      <div class="comments-list" id="commentsList"></div>
      <div class="add-comment">
        <div class="comment-avatar">NC</div>
        <textarea id="newCommentText" placeholder="Escreva um comentário... (Ctrl+Enter para enviar)"></textarea>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:6px;margin-bottom:6px">
        <button class="btn btn-ghost" id="addCommentBtn">Enviar comentário</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-danger" id="deleteCardBtn" style="margin-right:auto">Excluir</button>
      <button class="btn btn-ghost" id="cancelCardBtn">Cancelar</button>
      <button class="btn btn-primary" id="saveCardBtn">Salvar alterações</button>
    </div>
  </div>
</div>

<!-- New card modal -->
<div class="modal-overlay" id="newCardModal">
  <div class="modal">
    <div class="modal-header">
      <span class="modal-title">Nova tarefa</span>
      <button class="modal-close" id="closeNewCardBtn">&#10005;</button>
    </div>
    <div class="modal-body">
      <div style="margin-bottom:14px">
        <label class="prop-label" style="display:block;margin-bottom:6px">Título *</label>
        <input type="text" class="prop-input" id="newCardTitle" placeholder="Nome da tarefa...">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <label class="prop-label" style="display:block;margin-bottom:6px">Status</label>
          <select class="prop-select" id="newCardStatus">
            <option value="A Fazer">A Fazer</option>
            <option value="&#128308; Em Andamento">&#128308; Em Andamento</option>
            <option value="&#128992; Revisão">&#128992; Revisão</option>
            <option value="&#9989; Concluído">&#9989; Concluído</option>
          </select>
        </div>
        <div>
          <label class="prop-label" style="display:block;margin-bottom:6px">Prioridade</label>
          <select class="prop-select" id="newCardPrioridade">
            <option value="Média">&#128993; Média</option>
            <option value="Alta">&#128293; Alta</option>
            <option value="Baixa">&#129001; Baixa</option>
          </select>
        </div>
        <div>
          <label class="prop-label" style="display:block;margin-bottom:6px">Responsável</label>
          <select class="prop-select" id="newCardResponsavel">
            <option value="NAYARA">NAYARA</option>
            <option value="CLIENTE">CLIENTE</option>
            <option value="CANDIDO">CANDIDO</option>
          </select>
        </div>
        <div>
          <label class="prop-label" style="display:block;margin-bottom:6px">Setor</label>
          <select class="prop-select" id="newCardSetor">
            <option value="">—</option>
            <option>Operacional</option><option>Estratégico</option><option>Financeiro</option><option>Vendas</option>
            <option>Jurídico</option><option>RH</option><option>Marketing</option><option>Administrativo</option><option>Inovação</option><option>Liderança</option>
          </select>
        </div>
        <div>
          <label class="prop-label" style="display:block;margin-bottom:6px">Prazo</label>
          <input type="date" class="prop-input" id="newCardPrazo">
        </div>
        <div>
          <label class="prop-label" style="display:block;margin-bottom:6px">Urgência</label>
          <select class="prop-select" id="newCardUrgencia">
            <option value="Sem prioridade">Sem prioridade</option>
            <option value="Alta">Alta</option><option value="Média">Média</option><option value="Baixa">Baixa</option>
          </select>
        </div>
      </div>
      <div style="margin-bottom:14px">
        <label class="prop-label" style="display:block;margin-bottom:6px">Observações</label>
        <textarea class="prop-textarea" id="newCardObservacoes" placeholder="Detalhes, contexto, links..."></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelNewCardBtn">Cancelar</button>
      <button class="btn btn-primary" id="createCardBtn">Criar tarefa</button>
    </div>
  </div>
</div>

<!-- Config panel -->
<div class="config-overlay" id="configOverlay"></div>
<aside class="config-panel" id="configPanel">
  <div class="config-header">
    <span class="config-title">&#9881; Configurações da base</span>
    <button class="modal-close" id="closeConfigBtn">&#10005;</button>
  </div>
  <div class="config-tabs">
    <button class="config-tab active" data-config="layout">Layout</button>
    <button class="config-tab" data-config="visibilidade">Visibilidade</button>
    <button class="config-tab" data-config="filtros">Filtros</button>
    <button class="config-tab" data-config="ordenar">Ordenar</button>
    <button class="config-tab" data-config="agrupar">Agrupar</button>
    <button class="config-tab" data-config="cor">Cor</button>
  </div>
  <div class="config-body">
    <div class="config-section active" data-section="layout">
      <h4>Ícone da base</h4>
      <p>Escolha um emoji para representar esta base na sidebar.</p>
      <div class="icon-picker" id="iconPicker"></div>
      <h4>Cor da capa</h4>
      <p>Cor usada no ícone da base e em destaques.</p>
      <div class="color-picker" id="colorPicker"></div>
      <h4>Propriedades</h4>
      <p>Arraste para reordenar. Clique no olho para ocultar/mostrar na tabela.</p>
      <div class="prop-reorder-list" id="propReorderList"></div>
      <button class="btn btn-ghost" id="addPropBtn" style="width:100%;margin-top:4px;justify-content:center">+ Nova propriedade</button>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">
        <h4>Colunas do Kanban</h4>
        <p>Gerencie as colunas do quadro.</p>
        <div id="colConfigList"></div>
        <button class="btn btn-ghost" id="addColBtn" style="width:100%;margin-top:4px;justify-content:center">+ Adicionar coluna</button>
      </div>
    </div>
    <div class="config-section" data-section="visibilidade">
      <h4>Colunas visíveis</h4>
      <p>Escolha quais propriedades aparecem como colunas na vista Tabela.</p>
      <div id="visibilityList"></div>
    </div>
    <div class="config-section" data-section="filtros">
      <h4>Construtor de filtros</h4>
      <p>Defina condições para restringir os cards visíveis.</p>
      <div class="filter-builder" id="configFilterBuilder"></div>
      <button class="filter-add-btn" id="addFilterRowBtn" style="margin-top:8px">+ Adicionar condição</button>
    </div>
    <div class="config-section" data-section="ordenar">
      <h4>Ordenação</h4>
      <p>Arraste para reordenar regras. A primeira é a principal.</p>
      <div class="prop-reorder-list" id="sortList"></div>
    </div>
    <div class="config-section" data-section="agrupar">
      <h4>Agrupar cards por</h4>
      <p>Escolha como as colunas do Kanban são organizadas.</p>
      <div style="display:flex;flex-direction:column;gap:6px" id="groupByOptions"></div>
    </div>
    <div class="config-section" data-section="cor">
      <h4>Regras de coloração</h4>
      <p>Defina cores automáticas por valor de propriedade.</p>
      <div id="colorRulesList"></div>
      <button class="filter-add-btn" id="addColorRuleBtn" style="margin-top:8px">+ Adicionar regra</button>
    </div>
  </div>
</aside>

<!-- Add property modal -->
<div class="modal-overlay" id="addPropModal">
  <div class="modal" style="width:480px">
    <div class="modal-header">
      <span class="modal-title">Nova propriedade</span>
      <button class="modal-close" id="closeAddPropBtn">&#10005;</button>
    </div>
    <div class="modal-body">
      <div style="margin-bottom:14px">
        <label class="prop-label" style="display:block;margin-bottom:6px">Nome da propriedade *</label>
        <input type="text" class="prop-input" id="propNameInput" placeholder="Ex: Telefone, Link, Setor...">
      </div>
      <div style="margin-bottom:14px">
        <label class="prop-label" style="display:block;margin-bottom:8px">Tipo</label>
        <div class="prop-type-grid" id="propTypeGrid"></div>
      </div>
      <div id="propSelectOptions" style="display:none;margin-bottom:14px">
        <label class="prop-label" style="display:block;margin-bottom:6px">Opções (uma por linha)</label>
        <textarea class="prop-textarea" id="propSelectValues" rows="3" placeholder="Opcao 1\nOpcao 2\nOpcao 3"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelAddPropBtn">Cancelar</button>
      <button class="btn btn-primary" id="confirmAddPropBtn">Adicionar</button>
    </div>
  </div>
</div>

<!-- Add column modal -->
<div class="modal-overlay" id="addColModal">
  <div class="modal" style="width:420px">
    <div class="modal-header">
      <span class="modal-title">Nova coluna</span>
      <button class="modal-close" id="closeAddColBtn">&#10005;</button>
    </div>
    <div class="modal-body">
      <div style="margin-bottom:14px">
        <label class="prop-label" style="display:block;margin-bottom:6px">Nome da coluna *</label>
        <input type="text" class="prop-input" id="colNameInput" placeholder="Ex: Aprovacao, Backlog...">
      </div>
      <div style="margin-bottom:14px">
        <label class="prop-label" style="display:block;margin-bottom:8px">Cor</label>
        <div class="color-picker" id="colColorPicker"></div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelAddColBtn">Cancelar</button>
      <button class="btn btn-primary" id="confirmAddColBtn">Adicionar coluna</button>
    </div>
  </div>
</div>

<!-- Filter dropdown modal -->
<div class="modal-overlay" id="filterModal">
  <div class="modal" style="width:400px">
    <div class="modal-header">
      <span class="modal-title">Filtrar tarefas</span>
      <button class="modal-close" id="closeFilterBtn">&#10005;</button>
    </div>
    <div class="modal-body">
      <div class="filter-builder" id="activeFilterBuilder"></div>
      <button class="filter-add-btn" id="addActiveFilterBtn" style="margin-top:8px">+ Adicionar condição</button>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border);display:flex;gap:8px">
        <button class="filter-add-btn" style="flex:1;justify-content:center" id="clearFiltersBtn">Limpar filtros</button>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="cancelFilterBtn">Cancelar</button>
      <button class="btn btn-primary" id="applyFilterBtn">Aplicar filtros</button>
    </div>
  </div>
</div>

<!-- Theme toggle -->
<button class="theme-toggle" id="themeToggle">
  <span class="theme-icon" id="themeIcon">&#127769;</span>
  <span id="themeLabel">Escuro</span>
</button>
''')

w('''
<script>
// ====================================================================
// DATA MODEL
// ====================================================================
const STORAGE_KEY = 'pulso-kanban-v2';
const COLORS = ['#74C69D','#3B82F6','#F472B6','#FB923C','#A78BFA','#FBBF24','#EF4444','#1B4332'];
const COL_COLORS = ['#94A3B8','#3B82F6','#EAB308','#22C55E','#DC2626','#A855F7','#F97316','#EC4899'];
const ICONS = ['&#128203;','&#128202;','&#127919;','&#128188;','&#128197;','&#128196;','&#128464;','&#128200;','&#9881;','&#128279;','&#128161;','&#128293;','&#11088;','&#128204;','&#9989;','&#128269;'];
const PROP_ICONS = {text:'T',number:'#',select:'&#9673;',multiselect:'&#9745;',date:'&#128197;',person:'&#128100;',checkbox:'&#9744;',url:'&#128279;',email:'@',phone:'&#128222;'};
const PROP_TYPES = ['text','number','select','multiselect','date','person','checkbox','url','email','phone'];

const DEFAULT_COLUMNS = [
  {id:'A Fazer',         label:'A Fazer',          color:'#94A3B8'},
  {id:'🔵; Em Andamento', label:'🔵; Em Andamento', color:'#3B82F6'},
  {id:'🟡; Revisao',      label:'🟡; Revisao',      color:'#EAB308'},
  {id:'✅; Concluido',     label:'✅; Concluido',     color:'#22C55E'}
];

const DEFAULT_CARDS = [
  {id:'card-1', titulo:'Criar apresentacao RADAR pro Jefferson', status:'A Fazer', prioridade:'Alta', responsavel:'NAYARA', setor:'Estrategico', prazo:'2026-09-15', urgencia:'Alta', estimativa:4, cliente:'JS Construtora (Jefferson)', observacoes:'Deck consolidando scores do BIN.', subtarefas:[{id:'s1',texto:'Coletar scores',done:true},{id:'s2',texto:'Estruturar narrativa',done:true},{id:'s3',texto:'Slide causa raiz',done:false},{id:'s4',texto:'Slide de acao',done:false},{id:'s5',texto:'Revisao Nayara',done:false}], comentarios:[], bloqueadaPor:''},
  {id:'card-2', titulo:'Exportar dados RS Company pro Drive', status:'A Fazer', prioridade:'Media', responsavel:'NAYARA', setor:'Administrativo', prazo:'2026-09-18', urgencia:'Media', estimativa:2, cliente:'RS Company (Lavinia + Ederson)', observacoes:'', subtarefas:[], comentarios:[], bloqueadaPor:''},
  {id:'card-3', titulo:'Revisar contrato Ontech TI', status:'A Fazer', prioridade:'Media', responsavel:'NAYARA', setor:'Juridico', prazo:'2026-09-20', urgencia:'Media', estimativa:3, cliente:'Ontech TI (Renato)', observacoes:'', subtarefas:[], comentarios:[], bloqueadaPor:''},
  {id:'card-4', titulo:'Validar BIN RADAR - JS Construtora', status:'🔵; Em Andamento', prioridade:'Alta', responsavel:'NAYARA', setor:'Estrategico', prazo:'2026-09-12', urgencia:'Alta', estimativa:6, cliente:'JS Construtora (Jefferson)', observacoes:'Validacao final dos 10 setores.', subtarefas:[{id:'s1',texto:'Coletar evidencias',done:true},{id:'s2',texto:'Cruzar setores',done:true},{id:'s3',texto:'Sintese executiva',done:true}], comentarios:[], bloqueadaPor:'Proposta RS Company'},
  {id:'card-5', titulo:'Implementar motor de colecoes', status:'🔵; Em Andamento', prioridade:'Alta', responsavel:'NAYARA', setor:'Operacional', prazo:'2026-09-10', urgencia:'Alta', estimativa:16, cliente:'', observacoes:'Story 1.6.', subtarefas:[{id:'s1',texto:'Schema RLS',done:true},{id:'s2',texto:'CRUD basico',done:true},{id:'s3',texto:'Hooks listagem',done:true},{id:'s4',texto:'Filtros avancados',done:false},{id:'s5',texto:'Drag and drop',done:false},{id:'s6',texto:'Testes e2e',done:false},{id:'s7',texto:'QA Gate',done:false},{id:'s8',texto:'Deploy',done:false}], comentarios:[], bloqueadaPor:''},
  {id:'card-6', titulo:'Proposta Land Grow Scale - RS Company', status:'🟡; Revisao', prioridade:'Alta', responsavel:'NAYARA', setor:'Vendas', prazo:'2026-09-08', urgencia:'Alta', estimativa:8, cliente:'RS Company (Lavinia + Ederson)', observacoes:'Aguardando aprovacao da Nayara.', subtarefas:[], comentarios:[], bloqueadaPor:''},
  {id:'card-7', titulo:'Dashboard COMPASS - JS Construtora', status:'🟡; Revisao', prioridade:'Media', responsavel:'NAYARA', setor:'Financeiro', prazo:'2026-09-09', urgencia:'Media', estimativa:5, cliente:'JS Construtora (Jefferson)', observacoes:'', subtarefas:[], comentarios:[], bloqueadaPor:''},
  {id:'card-8', titulo:'Kick-off Ontech TI', status:'✅; Concluido', prioridade:'Baixa', responsavel:'NAYARA', setor:'Lideranca', prazo:'2026-09-05', urgencia:'Baixa', estimativa:2, cliente:'Ontech TI (Renato)', observacoes:'Reuniao inicial realizada.', subtarefas:[], comentarios:[{id:'c1',autor:'NC',texto:'Onboarding concluido. Renato confirmou agenda semanal.',data:'05/09/2026'}], bloqueadaPor:''}
];

// ===== STATE =====
let state = {
  cards: [],
  grouping: 'status',
  sort: 'prazo',
  sortDir: 'asc',
  activeFilters: [],
  searchTerm: '',
  configOpen: false,
  configTab: 'layout',
  baseIcon: '📋',
  baseColor: '#74C69D',
  columns: null,
  properties: [
    {key:'titulo',      label:'Titulo',       icon:'T',  visible:true},
    {key:'status',      label:'Status',       icon:'●',  visible:true},
    {key:'prioridade',  label:'Prioridade',   icon:'🔴', visible:true},
    {key:'responsavel', label:'Responsavel',  icon:'👤', visible:true},
    {key:'setor',       label:'Setor',        icon:'🏧', visible:true},
    {key:'prazo',       label:'Prazo',        icon:'📅', visible:true},
    {key:'urgencia',    label:'Urgencia',     icon:'⚡', visible:true},
    {key:'cliente',     label:'Cliente',      icon:'🏢', visible:true}
  ],
  currentView: 'kanban',
  editingCardId: null,
  colorRules: [],
  pendingPropType: 'text',
  pendingColColor: '#94A3B8',
  draggingCardId: null
};

// Initialize columns from defaults
state.columns = JSON.parse(JSON.stringify(DEFAULT_COLUMNS));

// ===== STORAGE =====
function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      cards: state.cards,
      grouping: state.grouping,
      sort: state.sort,
      sortDir: state.sortDir,
      properties: state.properties,
      baseIcon: state.baseIcon,
      baseColor: state.baseColor,
      columns: state.columns,
      colorRules: state.colorRules
    }));
  } catch(e) {}
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.cards) state.cards = data.cards;
    if (data.grouping) state.grouping = data.grouping;
    if (data.sort) state.sort = data.sort;
    if (data.sortDir) state.sortDir = data.sortDir;
    if (data.properties) state.properties = data.properties;
    if (data.baseIcon) state.baseIcon = data.baseIcon;
    if (data.baseColor) state.baseColor = data.baseColor;
    if (data.columns) state.columns = data.columns;
    if (data.colorRules) state.colorRules = data.colorRules;
    return true;
  } catch(e) { return false; }
}

function initData() {
  if (!loadFromStorage()) {
    state.cards = JSON.parse(JSON.stringify(DEFAULT_CARDS));
    saveToStorage();
  }
}

// ====================================================================
// UTILITIES
// ====================================================================
function $(id) { return document.getElementById(id); }
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(iso) {
  if (!iso) return '';
  const p = iso.split('-');
  return p.length === 3 ? p[2]+'/'+p[1] : iso;
}
function isOverdue(iso) {
  if (!iso) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return new Date(iso+'T00:00:00') < today;
}
function isDone(status) { return status && status.includes('Concluido'); }
function isThisWeek(iso) {
  if (!iso) return false;
  const d = new Date(iso+'T00:00:00');
  const now = new Date();
  const start = new Date(now); start.setHours(0,0,0,0); start.setDate(now.getDate() - now.getDay());
  return d >= start && d < new Date(start.getTime() + 7*86400000);
}
function priorityClass(p) {
  if (p === 'Alta') return 'badge-high';
  if (p === 'Media') return 'badge-medium';
  return 'badge-low';
}
function priorityLabel(p) {
  if (p === 'Alta') return '🔴 Alta';
  if (p === 'Media') return '🟡 Media';
  if (p === 'Baixa') return '🟢 Baixa';
  return escapeHtml(p);
}
function statusBadgeStyle(status) {
  if (status === 'A Fazer') return 'background:#F1F5F9;color:#475569';
  if (status && status.includes('Em Andamento')) return 'background:#DBEAFE;color:#1E40AF';
  if (status && status.includes('Revisao')) return 'background:#FEF9C3;color:#854D0E';
  if (status && status.includes('Concluido')) return 'background:#DCFCE7;color:#166534';
  if (status && status.includes('Cancelado')) return 'background:#FEE2E2;color:#991B1B';
  return '';
}
function getCard(id) { return state.cards.find(c => c.id === id); }
function newId() { return 'card-'+Date.now()+'-'+Math.random().toString(36).slice(2,7); }
function today() {
  const d = new Date(), dd=String(d.getDate()).padStart(2,'0'), mm=String(d.getMonth()+1).padStart(2,'0'), yyyy=d.getFullYear();
  return dd+'/'+mm+'/'+yyyy;
}

// ====================================================================
// FILTERS
// ====================================================================
function getFilteredCards() {
  let cards = state.cards;
  const term = (state.searchTerm || '').toLowerCase().trim();
  if (term) {
    cards = cards.filter(c => {
      const hay = (c.titulo+' '+(c.observacoes||'')+' '+(c.setor||'')+' '+(c.cliente||'')).toLowerCase();
      return hay.includes(term);
    });
  }
  for (const f of state.activeFilters) {
    if (f.prop === 'prioridade' && f.op === 'equals') cards = cards.filter(c => c.prioridade === f.value);
    else if (f.prop === 'responsavel' && f.op === 'equals') cards = cards.filter(c => c.responsavel === f.value);
    else if (f.prop === 'setor' && f.op === 'equals') cards = cards.filter(c => c.setor === f.value);
    else if (f.prop === 'cliente' && f.op === 'equals') cards = cards.filter(c => c.cliente === f.value);
    else if (f.prop === 'status' && f.op === 'equals') cards = cards.filter(c => c.status === f.value);
    else if (f.prop === 'status' && f.op === 'not_equals') cards = cards.filter(c => c.status !== f.value);
    else if (f.prop === 'prioridade' && f.op === 'not_equals') cards = cards.filter(c => c.prioridade !== f.value);
    else if (f.prop === 'titulo' && f.op === 'contains') cards = cards.filter(c => c.titulo.toLowerCase().includes(f.value.toLowerCase()));
  }
  return cards;
}

function sortCards(arr) {
  const s = state.sort, dir = state.sortDir === 'desc' ? -1 : 1;
  const order = {'Alta':0,'Media':1,'Baixa':2};
  const sorted = arr.slice();
  if (s === 'prazo') sorted.sort((a,b) => (a.prazo||'9999').localeCompare(b.prazo||'9999') * dir);
  else if (s === 'prioridade') sorted.sort((a,b) => ((order[a.prioridade]??9)-(order[b.prioridade]??9)) * dir);
  else if (s === 'titulo') sorted.sort((a,b) => (a.titulo||'').localeCompare(b.titulo||'','pt-BR') * dir);
  return sorted;
}

// ====================================================================
// RENDER KANBAN
// ====================================================================
function renderKanban() {
  state.searchTerm = $('searchInput').value;
  const view = $('kanbanView');
  const cards = sortCards(getFilteredCards());
  const gk = state.grouping;
  const groups = {};
  const colDefs = buildColDefs(gk);
  colDefs.forEach(c => groups[c.id] = []);
  cards.forEach(c => {
    const key = getCardGroupKey(c, gk);
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });
  let html = '';
  for (const col of colDefs) {
    const items = groups[col.id] || [];
    const dotColor = col.color || '#94A3B8';
    html += '<div class="kanban-col" data-col-id="'+escapeHtml(col.id)+'" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)">';
    html += '<div class="kanban-col-header"><div class="kanban-col-dot" style="background:'+dotColor+'"></div><span class="kanban-col-name">'+escapeHtml(col.label)+'</span><span class="kanban-col-count">'+items.length+'</span></div>';
    if (items.length === 0) {
      html += '<div class="empty-col">Nenhuma tarefa</div>';
    } else {
      items.forEach(c => { html += renderCard(c); });
    }
    html += '<button class="kanban-add-card" data-prefill-status="'+escapeHtml(col.id)+'">+ Adicionar tarefa</button>';
    html += '</div>';
  }
  view.innerHTML = html;
  view.classList.remove('hidden');
  renderFilterTags();
  updateGroupingLabel();
  renderTable();
}

function buildColDefs(gk) {
  if (gk === 'status') {
    return state.columns.map(c => ({id: c.id, label: c.label, color: c.color}));
  }
  if (gk === 'prioridade') {
    return [{id:'Alta',label:'🔴 Alta',color:'#DC2626'},{id:'Media',label:'🟡 Media',color:'#D97706'},{id:'Baixa',label:'🟢 Baixa',color:'#16A34A'}];
  }
  if (gk === 'responsavel') {
    return [
      {id:'NAYARA',label:'👤 NAYARA',color:'#1B4332'},
      {id:'CLIENTE',label:'🏢 CLIENTE',color:'#74C69D'},
      {id:'CANDIDO',label:'👤 CANDIDO',color:'#3B82F6'},
      {id:'',label:'- Sem responsavel -',color:'#94A3B8'}
    ];
  }
  if (gk === 'setor') {
    const sects = ['Operacional','RH','Financeiro','Marketing','Administrativo','Estrategico','Vendas','Inovacao','Juridico','Lideranca'];
    return sects.map(s => ({id:s,label:s,color:'#74C69D'})).concat([{id:'',label:'- Sem setor -',color:'#94A3B8'}]);
  }
  return [{id:'A Fazer',label:'A Fazer',color:'#94A3B8'}];
}

function getCardGroupKey(c, gk) {
  if (gk === 'status') return c.status;
  if (gk === 'prioridade') return c.prioridade;
  if (gk === 'responsavel') return c.responsavel || '';
  if (gk === 'setor') return c.setor || '';
  return c.status;
}

function renderCard(c) {
  const dateClass = isDone(c.status) ? 'kanban-date done' : (isOverdue(c.prazo) ? 'kanban-date overdue' : 'kanban-date');
  const dateText = c.prazo ? formatDate(c.prazo) : '';
  const overdueMark = !isDone(c.status) && isOverdue(c.prazo) ? ' ⚠' : '';
  const doneMark = isDone(c.status) ? ' ✓' : '';
  const sub = (c.subtarefas||[]);
  const subdone = sub.filter(s=>s.done).length;
  const subHtml = sub.length > 0 ? '<span class="kanban-subtasks">&#9745; '+subdone+'/'+sub.length+' sub</span>' : '';
  const blocked = c.bloqueadaPor ? '<span class="kanban-dependency">&#128279; '+escapeHtml(c.bloqueadaPor)+'</span>' : '';
  const tags = [];
  if (c.setor) tags.push('<span class="badge badge-tag">'+escapeHtml(c.setor)+'</span>');
  if (c.responsavel === 'CLIENTE') tags.push('<span class="badge badge-person">🏢 CLIENTE</span>');
  if (c.responsavel === 'CANDIDO') tags.push('<span class="badge badge-person">👤 CANDIDO</span>');
  const person = c.responsavel ? c.responsavel.substring(0,2) : '-';
  let html = '<div class="kanban-card" draggable="true" data-card-id="'+escapeHtml(c.id)+'">';
  html += '<div class="kanban-card-title">'+escapeHtml(c.titulo)+'</div>';
  html += '<div class="kanban-card-meta">';
  html += '<span class="badge '+priorityClass(c.prioridade)+'">'+priorityLabel(c.prioridade)+'</span>';
  if (tags.length) html += tags.join('');
  html += '</div>';
  if (subHtml || blocked) {
    html += '<div class="kanban-card-meta">'+subHtml+blocked+'</div>';
  }
  html += '<div class="kanban-card-footer">';
  html += '<span class="'+dateClass+'">'+escapeHtml(dateText)+overdueMark+doneMark+'</span>';
  html += '<div class="kanban-person" title="'+escapeHtml(c.responsavel||'-')+'">'+escapeHtml(person)+'</div>';
  html += '</div></div>';
  return html;
}

// ====================================================================
// RENDER TABLE
// ====================================================================
function renderTable() {
  const cards = sortCards(getFilteredCards());
  const tbody = $('tableBody');
  const thead = $('tableHead');
  if (!tbody) return;
  const visProps = state.properties.filter(p => p.visible);
  if (thead) {
    thead.innerHTML = '<tr><th style="width:32px">&#9744;</th>'+visProps.map(p => '<th>'+escapeHtml(p.label)+'</th>').join('')+'</tr>';
  }
  let html = '';
  for (const c of cards) {
    const dateClass = isDone(c.status) ? 'color:var(--success);font-weight:600' : (isOverdue(c.prazo) ? 'color:var(--danger);font-weight:600' : 'color:var(--text-muted)');
    const overdueMark = !isDone(c.status) && isOverdue(c.prazo) ? ' ⚠' : '';
    let cells = '';
    for (const p of visProps) {
      if (p.key === 'titulo') cells += '<td><strong>'+escapeHtml(c.titulo)+'</strong></td>';
      else if (p.key === 'status') cells += '<td><span class="status-badge" style="'+statusBadgeStyle(c.status)+'">'+escapeHtml(c.status)+'</span></td>';
      else if (p.key === 'prioridade') cells += '<td><span class="badge '+priorityClass(c.prioridade)+'">'+priorityLabel(c.prioridade)+'</span></td>';
      else if (p.key === 'responsavel') cells += '<td>'+(c.responsavel?escapeHtml(c.responsavel):'-')+'</td>';
      else if (p.key === 'setor') cells += '<td>'+(c.setor?escapeHtml(c.setor):'-')+'</td>';
      else if (p.key === 'prazo') cells += '<td style="'+dateClass+'">'+escapeHtml(formatDate(c.prazo))+overdueMark+'</td>';
      else if (p.key === 'urgencia') cells += '<td>'+escapeHtml(c.urgencia||'-')+'</td>';
      else if (p.key === 'cliente') cells += '<td>'+(c.cliente?escapeHtml(c.cliente):'-')+'</td>';
      else {
        const val = c[p.key];
        cells += '<td>'+(val?escapeHtml(String(val)):'-')+'</td>';
      }
    }
    html += '<tr class="table-row" data-card-id="'+escapeHtml(c.id)+'"><td><input type="checkbox" style="width:16px;height:16px;cursor:pointer"></td>'+cells+'</tr>';
  }
  const colCount = visProps.length + 1;
  tbody.innerHTML = html || '<tr><td colspan="'+colCount+'" style="text-align:center;padding:24px;color:var(--text-faint)">Nenhuma tarefa encontrada</td></tr>';
}

// ====================================================================
// DRAG AND DROP
// ====================================================================
function handleDragStart(e) {
  const card = e.target.closest('.kanban-card');
  if (!card) return;
  state.draggingCardId = card.getAttribute('data-card-id');
  e.dataTransfer.setData('text/plain', state.draggingCardId);
  e.dataTransfer.effectAllowed = 'move';
  card.classList.add('dragging');
}
function handleDragEnd(e) {
  const card = e.target.closest('.kanban-card');
  if (card) card.classList.remove('dragging');
  document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
  state.draggingCardId = null;
}
function handleDragOver(e) {
  if (!e.target.closest('.kanban-col')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const col = e.target.closest('.kanban-col');
  if (!col.classList.contains('drag-over')) col.classList.add('drag-over');
}
function handleDragLeave(e) {
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  if (e.relatedTarget && col.contains(e.relatedTarget)) return;
  col.classList.remove('drag-over');
}
function handleDrop(e) {
  e.preventDefault();
  const col = e.target.closest('.kanban-col');
  if (!col) return;
  col.classList.remove('drag-over');
  const cardId = e.dataTransfer.getData('text/plain') || state.draggingCardId;
  const newKey = col.getAttribute('data-col-id');
  if (!cardId || !newKey) return;
  const card = getCard(cardId);
  if (!card) return;
  const gk = state.grouping;
  if (gk === 'status') card.status = newKey;
  else if (gk === 'prioridade') card.prioridade = newKey;
  else if (gk === 'responsavel') card.responsavel = newKey;
  else if (gk === 'setor') card.setor = newKey;
  saveToStorage();
  renderKanban();
}

// ====================================================================
// CARD MODAL
// ====================================================================
function openCardModal(cardId) {
  const c = getCard(cardId);
  if (!c) return;
  state.editingCardId = cardId;
  $('cardTitle').value = c.titulo || '';
  $('cardStatus').value = c.status || 'A Fazer';
  $('cardPrioridade').value = c.prioridade || 'Media';
  $('cardResponsavel').value = c.responsavel || '';
  $('cardSetor').value = c.setor || '';
  $('cardPrazo').value = c.prazo || '';
  $('cardUrgencia').value = c.urgencia || 'Sem prioridade';
  $('cardEstimativa').value = c.estimativa || '';
  $('cardCliente').value = c.cliente || '';
  $('cardObservacoes').value = c.observacoes || '';
  renderCustomFields(c);
  renderSubtasks(c);
  renderComments(c);
  openModal('cardModal');
  setTimeout(() => $('cardTitle').focus(), 100);
}

function renderCustomFields(c) {
  const sec = $('customFieldsSection');
  if (!sec) return;
  const custom = state.properties.filter(p => !['titulo','status','prioridade','responsavel','setor','prazo','urgencia','estimativa','cliente','observacoes'].includes(p.key));
  if (custom.length === 0) {
    sec.innerHTML = '<div style="font-size:12px;color:var(--text-faint);padding:4px 0">Nenhum campo personalizado. Use o botao + Nova propriedade.</div>';
    return;
  }
  sec.innerHTML = custom.map(p => {
    const val = (c.customFields && c.customFields[p.key] !== undefined) ? c.customFields[p.key] : '';
    if (p.type === 'text' || p.type === 'url' || p.type === 'email' || p.type === 'phone') {
      return '<div style="margin-bottom:10px"><label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">'+escapeHtml(p.label)+'</label><input class="prop-input" id="cf_'+escapeHtml(p.key)+'" value="'+escapeHtml(val)+'"></div>';
    } else if (p.type === 'number') {
      return '<div style="margin-bottom:10px"><label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">'+escapeHtml(p.label)+'</label><input type="number" class="prop-input" id="cf_'+escapeHtml(p.key)+'" value="'+escapeHtml(val)+'"></div>';
    } else if (p.type === 'date') {
      return '<div style="margin-bottom:10px"><label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">'+escapeHtml(p.label)+'</label><input type="date" class="prop-input" id="cf_'+escapeHtml(p.key)+'" value="'+escapeHtml(val)+'"></div>';
    } else if (p.type === 'checkbox') {
      return '<div style="margin-bottom:10px;display:flex;align-items:center;gap:8px"><input type="checkbox" id="cf_'+escapeHtml(p.key)+'" '+(val?'checked':'')+' style="width:16px;height:16px"><label style="font-size:13px;cursor:pointer">'+escapeHtml(p.label)+'</label></div>';
    } else if (p.type === 'select' || p.type === 'multiselect') {
      const opts = (p.options||[]).map(o => '<option value="'+escapeHtml(o)+'" '+(val===o?'selected':'')+'>'+escapeHtml(o)+'</option>').join('');
      return '<div style="margin-bottom:10px"><label style="font-size:12px;font-weight:600;color:var(--text-muted);display:block;margin-bottom:4px">'+escapeHtml(p.label)+'</label><select class="prop-select" id="cf_'+escapeHtml(p.key)+'">'+opts+'</select></div>';
    }
    return '';
  }).join('');
}

function renderSubtasks(c) {
  const list = $('subtaskList');
  const subs = c.subtarefas || [];
  $('subtaskProgress').textContent = '('+subs.filter(s=>s.done).length+'/'+subs.length+')';
  if (subs.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text-faint);padding:6px 8px">Nenhuma subtarefa.</div>';
    return;
  }
  list.innerHTML = subs.map(s => {
    const cls = s.done ? 'checked' : '';
    const txtCls = s.done ? 'done' : '';
    return '<div class="subtask-row"><div class="subtask-checkbox '+cls+'" data-sub-id="'+escapeHtml(s.id)+'">'+(s.done?'&#10003;':'')+'</div><input class="subtask-text '+txtCls+'" value="'+escapeHtml(s.texto)+'" data-sub-id="'+escapeHtml(s.id)+'"><button class="subtask-remove" data-sub-id="'+escapeHtml(s.id)+'">&#10005;</button></div>';
  }).join('');
}

function renderComments(c) {
  const list = $('commentsList');
  const cmts = c.comentarios || [];
  if (cmts.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text-faint);padding:6px 8px">Sem comentarios ainda.</div>';
    return;
  }
  list.innerHTML = cmts.map(cm => {
    return '<div class="comment-row"><div class="comment-avatar">'+escapeHtml(cm.autor||'NC')+'</div><div class="comment-body"><div class="comment-meta"><strong>'+escapeHtml(cm.autor||'NC')+'</strong><span>'+escapeHtml(cm.data||'')+'</span></div><div class="comment-text">'+escapeHtml(cm.texto)+'</div></div></div>';
  }).join('');
}

function saveCard() {
  const c = getCard(state.editingCardId);
  if (!c) return;
  c.titulo = $('cardTitle').value.trim() || c.titulo;
  c.status = $('cardStatus').value;
  c.prioridade = $('cardPrioridade').value;
  c.responsavel = $('cardResponsavel').value;
  c.setor = $('cardSetor').value;
  c.prazo = $('cardPrazo').value;
  c.urgencia = $('cardUrgencia').value;
  c.estimativa = parseInt($('cardEstimativa').value) || 0;
  c.cliente = $('cardCliente').value;
  c.observacoes = $('cardObservacoes').value;
  // Save custom fields
  const custom = state.properties.filter(p => !['titulo','status','prioridade','responsavel','setor','prazo','urgencia','estimativa','cliente','observacoes'].includes(p.key));
  if (!c.customFields) c.customFields = {};
  for (const p of custom) {
    const input = document.getElementById('cf_'+p.key);
    if (!input) continue;
    if (p.type === 'checkbox') c.customFields[p.key] = input.checked;
    else if (p.type === 'number') c.customFields[p.key] = parseFloat(input.value) || 0;
    else c.customFields[p.key] = input.value;
  }
  saveToStorage();
  closeCardModal();
  renderKanban();
}

function deleteCard() {
  if (!state.editingCardId) return;
  const c = getCard(state.editingCardId);
  if (!c) return;
  if (!confirm('Excluir \"'+c.titulo+'\"? Esta acao nao pode ser desfeita.')) return;
  state.cards = state.cards.filter(x => x.id !== state.editingCardId);
  saveToStorage();
  closeCardModal();
  renderKanban();
}

function closeCardModal() {
  $('cardModal').classList.remove('open');
  state.editingCardId = null;
}

// ====================================================================
// NEW CARD
// ====================================================================
function openNewCardModal(prefill) {
  $('newCardTitle').value = '';
  $('newCardStatus').value = prefill || 'A Fazer';
  $('newCardPrioridade').value = 'Media';
  $('newCardResponsavel').value = 'NAYARA';
  $('newCardSetor').value = '';
  $('newCardPrazo').value = '';
  $('newCardUrgencia').value = 'Sem prioridade';
  $('newCardObservacoes').value = '';
  openModal('newCardModal');
  setTimeout(() => $('newCardTitle').focus(), 100);
}

function createNewCard() {
  const titulo = $('newCardTitle').value.trim();
  if (!titulo) { $('newCardTitle').focus(); return; }
  state.cards.unshift({
    id: newId(), titulo, status: $('newCardStatus').value, prioridade: $('newCardPrioridade').value,
    responsavel: $('newCardResponsavel').value, setor: $('newCardSetor').value, prazo: $('newCardPrazo').value,
    urgencia: $('newCardUrgencia').value, estimativa: 0, cliente: '', observacoes: $('newCardObservacoes').value,
    subtarefas: [], comentarios: [], bloqueadaPor: ''
  });
  saveToStorage();
  closeModal('newCardModal');
  renderKanban();
}

// ====================================================================
// MODAL HELPERS
// ====================================================================
function openModal(id) { $e = $(id); if($e) $e.classList.add('open'); }
function closeModal(id) { $e = $(id); if($e) $e.classList.remove('open'); }

// ====================================================================
// FILTER TAGS IN TOOLBAR
// ====================================================================
function renderFilterTags() {
  const wrap = $('filterTags');
  if (!wrap) return;
  if (state.activeFilters.length === 0) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = state.activeFilters.map((f, i) => {
    return '<span class="filter-chip">'+escapeHtml(f.prop)+' '+escapeHtml(f.op)+' '+escapeHtml(f.value)+'<span class="filter-chip-remove" data-fi="'+i+'">&#10005;</span></span>';
  }).join('');
}

function updateGroupingLabel() {
  const lbl = $('groupingLabel');
  if (!lbl) return;
  if (state.grouping === 'status') { lbl.style.display = 'none'; return; }
  const names = {prioridade:'Prioridade',responsavel:'Responsavel',setor:'Setor'};
  lbl.textContent = 'Agrupado por: '+(names[state.grouping]||state.grouping);
  lbl.style.display = 'inline';
}

// ====================================================================
// CONFIG PANEL
// ====================================================================
function openConfigPanel() {
  state.configOpen = true;
  setConfigTab(state.configTab);
  renderConfigIconPicker();
  renderConfigColorPicker();
  renderConfigProperties();
  renderConfigVisibility();
  renderConfigSort();
  renderConfigGroupBy();
  renderConfigColorRules();
  renderColConfig();
  $('configPanel').classList.add('open');
  $('configOverlay').classList.add('open');
}

function closeConfigPanel() {
  state.configOpen = false;
  $('configPanel').classList.remove('open');
  $('configOverlay').classList.remove('open');
}

function setConfigTab(tabName) {
  state.configTab = tabName;
  document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector('[data-config=\"'+tabName+'\"]');
  if (tab) tab.classList.add('active');
  document.querySelectorAll('.config-section').forEach(s => s.classList.remove('active'));
  const sec = document.querySelector('[data-section=\"'+tabName+'\"]');
  if (sec) sec.classList.add('active');
}

function renderConfigIconPicker() {
  const wrap = $('iconPicker');
  wrap.innerHTML = ICONS.map(ic => {
    return '<button class="icon-option'+(ic === state.baseIcon?' selected':'')+'" data-icon="'+escapeHtml(ic)+'">'+ic+'</button>';
  }).join('');
}

function renderConfigColorPicker() {
  const wrap = $('colorPicker');
  wrap.innerHTML = COLORS.map(cl => {
    return '<div class="color-option'+(cl === state.baseColor?' selected':'')+'" data-color="'+cl+'" style="background:'+cl+'"></div>';
  }).join('');
}

function renderConfigProperties() {
  const wrap = $('propReorderList');
  wrap.innerHTML = state.properties.map((p, i) => {
    const del = p.custom ? '<button class="prop-reorder-vis" data-delete-prop="'+escapeHtml(p.key)+'" style="color:var(--danger)">&#10005;</button>' : '';
    return '<div class="prop-reorder-item" draggable="true" data-prop-idx="'+i+'" data-prop-key="'+escapeHtml(p.key)+'"><span class="prop-reorder-handle">&#9776;</span><span class="prop-reorder-icon">'+escapeHtml(p.icon)+'</span><span class="prop-reorder-name">'+escapeHtml(p.label)+'</span>'+del+'<button class="prop-reorder-vis" data-toggle-vis="'+escapeHtml(p.key)+'">'+(p.visible?'&#128065;':'&#8855;')+'</button></div>';
  }).join('');
  attachPropDragHandlers();
}

function attachPropDragHandlers() {
  const items = document.querySelectorAll('#propReorderList .prop-reorder-item');
  items.forEach(item => {
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/prop-idx', item.getAttribute('data-prop-idx'));
      e.dataTransfer.effectAllowed = 'move';
      item.classList.add('dragging-prop');
    });
    item.addEventListener('dragend', e => {
      item.classList.remove('dragging-prop');
    });
    item.addEventListener('dragover', e => {
      e.preventDefault();
      item.classList.add('drag-over-prop');
    });
    item.addEventListener('dragleave', e => item.classList.remove('drag-over-prop'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over-prop');
      const from = parseInt(e.dataTransfer.getData('text/prop-idx'));
      const to = parseInt(item.getAttribute('data-prop-idx'));
      if (isNaN(from)||isNaN(to)||from===to) return;
      const [moved] = state.properties.splice(from,1);
      state.properties.splice(to,0,moved);
      saveToStorage();
      renderConfigProperties();
    });
  });
}

function renderConfigVisibility() {
  const wrap = $('visibilityList');
  wrap.innerHTML = state.properties.map(p => {
    const icon = p.custom ? PROP_ICONS[p.type]||'T' : p.icon;
    const type = p.custom ? '('+p.type+')' : '';
    return '<div class="toggle-row"><span class="toggle-label">'+escapeHtml(icon)+' '+escapeHtml(p.label)+' <span style="font-size:10px;color:var(--text-faint)">'+type+'</span></span><div class="toggle-switch'+(p.visible?' on':'')+'" data-toggle-vis="'+escapeHtml(p.key)+'"></div></div>';
  }).join('');
}

function renderConfigSort() {
  const wrap = $('sortList');
  const sorts = [
    {key:'prazo', icon:'📅', name:'Prazo', dir: state.sortDir==='asc'?'crescente':'decrescente'},
    {key:'prioridade', icon:'🔴', name:'Prioridade', dir: 'Alta -> Baixa'},
    {key:'titulo', icon:'T', name:'Nome', dir: state.sortDir==='asc'?'A -> Z':'Z -> A'}
  ];
  wrap.innerHTML = sorts.map(s => {
    const active = state.sort === s.key;
    return '<div class="prop-reorder-item" draggable="true" data-sort-key="'+s.key+'" style="'+(active?'border-color:var(--accent);background:var(--accent-dim)':'')+'"><span class="prop-reorder-handle">&#9776;</span><span class="prop-reorder-icon">'+s.icon+'</span><span class="prop-reorder-name">'+s.name+'</span><span style="font-size:11px;color:var(--text-faint)">'+s.dir+'</span></div>';
  }).join('');
}

function renderConfigGroupBy() {
  const wrap = $('groupByOptions');
  const options = [
    {key:'status', icon:'●', label:'Status'},
    {key:'prioridade', icon:'🔴', label:'Prioridade'},
    {key:'responsavel', icon:'👤', label:'Responsavel'},
    {key:'setor', icon:'🏧', label:'Setor'}
  ];
  wrap.innerHTML = options.map(o => {
    const active = state.grouping === o.key;
    return '<button class="chip'+(active?' active':'')+'" data-group-by="'+o.key+'" style="justify-content:flex-start;padding:8px 12px">'+o.icon+' '+o.label+'</button>';
  }).join('');
}

function renderConfigColorRules() {
  const wrap = $('colorRulesList');
  if (state.colorRules.length === 0) {
    wrap.innerHTML = '<div style="font-size:12px;color:var(--text-faint);padding:8px 0">Nenhuma regra. Adicione para colorir cards automaticamente.</div>';
    return;
  }
  const swatches = ['#DC2626','#D97706','#16A34A','#3B82F6','#A78BFA','#F472B6'];
  wrap.innerHTML = state.colorRules.map((r, i) => {
    const opts = getPropOptions(r.prop);
    const sel = '<select class="color-rule-select" data-rule-idx="'+i+'" data-rule-prop="'+r.prop+'">'+opts+'</select>';
    const sw = swatches.map(c => '<div class="color-rule-swatch'+(r.color===c?' selected':'')+'" data-rule-idx="'+i+'" data-rule-color="'+c+'" style="background:'+c+'"></div>').join('');
    return '<div class="color-rule">'+sel+sw+'<button class="color-rule-remove" data-rule-del="'+i+'">&#10005;</button></div>';
  }).join('');
}

function getPropOptions(prop) {
  const opts = prop==='prioridade'?['Alta','Media','Baixa']
    : prop==='responsavel'?['NAYARA','CLIENTE','CANDIDO']
    : prop==='setor'?['Operacional','RH','Financeiro','Marketing','Administrativo','Estrategico','Vendas','Inovacao','Juridico','Lideranca']
    : ['A Fazer','🔵; Em Andamento','🟡; Revisao','✅; Concluido'];
  return opts.map(o => '<option value="'+escapeHtml(o)+'">'+escapeHtml(o)+'</option>').join('');
}

function renderColConfig() {
  const wrap = $('colConfigList');
  wrap.innerHTML = state.columns.map(c => {
    return '<div class="col-item"><div class="col-item-dot" style="background:'+c.color+'"></div><span class="col-item-name">'+escapeHtml(c.label)+'</span><div class="col-item-actions"><button class="col-item-btn" data-edit-col="'+escapeHtml(c.id)+'" title="Editar">&#9998;</button><button class="col-item-btn delete" data-delete-col="'+escapeHtml(c.id)+'" title="Excluir">&#10005;</button></div></div>';
  }).join('');
}

// ====================================================================
// ADD PROPERTY
// ====================================================================
function openAddPropertyModal() {
  $('propNameInput').value = '';
  $('propSelectValues').value = '';
  $('propSelectOptions').style.display = 'none';
  state.pendingPropType = 'text';
  renderPropTypeGrid();
  openModal('addPropModal');
  setTimeout(() => $('propNameInput').focus(), 100);
}

function renderPropTypeGrid() {
  const wrap = $('propTypeGrid');
  wrap.innerHTML = PROP_TYPES.map(t => {
    const icon = PROP_ICONS[t] || 'T';
    const label = t.charAt(0).toUpperCase() + t.slice(1);
    const sel = state.pendingPropType === t ? ' selected' : '';
    return '<button class="prop-type-btn'+sel+'" data-type="'+t+'"><span class="prop-type-icon">'+icon+'</span><span class="prop-type-label">'+label+'</span></button>';
  }).join('');
}

function confirmAddProperty() {
  const name = $('propNameInput').value.trim();
  if (!name) { $('propNameInput').focus(); return; }
  const key = 'custom_'+Date.now();
  const icon = PROP_ICONS[state.pendingPropType] || 'T';
  const newProp = {key, label:name, icon, type:state.pendingPropType, visible:true, custom:true};
  if (state.pendingPropType === 'select' || state.pendingPropType === 'multiselect') {
    const lines = ($('propSelectValues').value||'').split('\\n').map(l=>l.trim()).filter(Boolean);
    newProp.options = lines;
  }
  state.properties.push(newProp);
  saveToStorage();
  closeModal('addPropModal');
  renderConfigProperties();
  renderConfigVisibility();
}

// ====================================================================
// ADD COLUMN
// ====================================================================
function openAddColumnModal() {
  $('colNameInput').value = '';
  state.pendingColColor = '#94A3B8';
  renderColColorPicker();
  openModal('addColModal');
  setTimeout(() => $('colNameInput').focus(), 100);
}

function renderColColorPicker() {
  const wrap = $('colColorPicker');
  wrap.innerHTML = COL_COLORS.map(cl => {
    return '<div class="color-option'+(cl===state.pendingColColor?' selected':'')+'" data-color="'+cl+'" style="background:'+cl+'"></div>';
  }).join('');
}

function confirmAddColumn() {
  const name = $('colNameInput').value.trim();
  if (!name) { $('colNameInput').focus(); return; }
  state.columns.push({id:name, label:name, color:state.pendingColColor});
  saveToStorage();
  closeModal('addColModal');
  renderColConfig();
  renderKanban();
}

// ====================================================================
// FILTER MODAL
// ====================================================================
function openFilterModal() {
  renderActiveFilterBuilder();
  openModal('filterModal');
}

function renderActiveFilterBuilder() {
  const wrap = $('activeFilterBuilder');
  if (state.activeFilters.length === 0) {
    wrap.innerHTML = '<div style="font-size:12px;color:var(--text-faint);padding:8px 0">Nenhum filtro ativo. Adicione condicoes abaixo.</div>';
    return;
  }
  wrap.innerHTML = state.activeFilters.map((f, i) => {
    return '<div class="filter-group"><div class="filter-row"><span class="filter-logic">E</span><select class="filter-select" data-fi="'+i+'" data-fi-prop="prop"><option value="prioridade"'+(f.prop==='prioridade'?' selected':'')+'>Prioridade</option><option value="responsavel"'+(f.prop==='responsavel'?' selected':'')+'>Responsavel</option><option value="setor"'+(f.prop==='setor'?' selected':'')+'>Setor</option><option value="status"'+(f.prop==='status'?' selected':'')+'>Status</option><option value="cliente"'+(f.prop==='cliente'?' selected':'')+'>Cliente</option><option value="titulo"'+(f.prop==='titulo'?' selected':'')+'>Titulo</option></select><select class="filter-select" data-fi="'+i+'" data-fi-op="op"><option value="equals"'+(f.op==='equals'?' selected':'')+'>e igual a</option><option value="not_equals"'+(f.op==='not_equals'?' selected':'')+'>nao e igual a</option><option value="contains"'+(f.op==='contains'?' selected':'')+'>contem</option></select><input class="filter-input" value="'+escapeHtml(f.value)+'" data-fi="'+i+'" data-fi-val="value" placeholder="valor"><button class="filter-remove" data-fi-remove="'+i+'">&#10005;</button></div></div>';
  }).join('');
}

function applyFilters() {
  const fiEls = document.querySelectorAll('[data-fi]');
  // rebuild from activeFilterBuilder inputs
  const newFilters = [];
  const rows = document.querySelectorAll('#activeFilterBuilder .filter-row');
  rows.forEach(row => {
    const prop = row.querySelector('[data-fi-prop]')?.value;
    const op = row.querySelector('[data-fi-op]')?.value;
    const val = row.querySelector('[data-fi-val]')?.value;
    if (prop && op) newFilters.push({prop, op, value: val || ''});
  });
  state.activeFilters = newFilters;
  saveToStorage();
  closeModal('filterModal');
  renderKanban();
}

function clearFilters() {
  state.activeFilters = [];
  saveToStorage();
  closeModal('filterModal');
  renderKanban();
}

// ====================================================================
// THEME
// ====================================================================
function toggleTheme() {
  const root = document.documentElement;
  const icon = $('themeIcon');
  const label = $('themeLabel');
  if (root.getAttribute('data-theme') === 'dark') {
    root.setAttribute('data-theme', 'light');
    icon.textContent = '☀️'; label.textContent = 'Claro';
  } else {
    root.setAttribute('data-theme', 'dark');
    icon.textContent = 'ቷ69'; label.textContent = 'Escuro';
  }
}

// ====================================================================
// EVENT DELEGATION - MAIN DISPATCHER
// ====================================================================
document.addEventListener('click', function(e) {
  // --- SIDEBAR ---
  const nav = e.target.closest('.sidebar-item');
  if (nav && nav.dataset.nav) {
    document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
    nav.classList.add('active');
    return;
  }
  const wsBtn = e.target.closest('#workspaceBtn');
  if (wsBtn) { wsBtn.classList.toggle('open'); return; }

  // --- VIEW TABS ---
  const vt = e.target.closest('.view-tab');
  if (vt && vt.dataset.view) {
    document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
    vt.classList.add('active');
    state.currentView = vt.dataset.view;
    const kanban = $('kanbanView');
    const table = $('tableView');
    if (state.currentView === 'kanban') {
      kanban.classList.remove('hidden');
      table.classList.remove('active');
    } else {
      kanban.classList.add('hidden');
      table.classList.add('active');
    }
    return;
  }

  // --- TOOLBAR FILTER BUTTON ---
  const filterBtn = e.target.closest('#filterBtn');
  if (filterBtn) { openFilterModal(); return; }

  // --- KANBAN CARDS (event delegation - no inline onclick!) ---
  const card = e.target.closest('.kanban-card');
  if (card && !e.target.closest('button')) {
    const cardId = card.getAttribute('data-card-id');
    if (cardId) openCardModal(cardId);
    return;
  }

  // --- KANBAN ADD CARD BUTTON ---
  const addCardBtn = e.target.closest('.kanban-add-card');
  if (addCardBtn) {
    const prefill = addCardBtn.getAttribute('data-prefill-status') || 'A Fazer';
    openNewCardModal(prefill);
    return;
  }

  // --- TABLE ROWS ---
  const tableRow = e.target.closest('.table-row');
  if (tableRow) {
    const cardId = tableRow.getAttribute('data-card-id');
    if (cardId) openCardModal(cardId);
    return;
  }

  // --- CONFIG BUTTON ---
  const cfgBtn = e.target.closest('#configBtn');
  if (cfgBtn) { openConfigPanel(); return; }

  // --- NEW BUTTON ---
  const newBtn = e.target.closest('#newBtn');
  if (newBtn) { openNewCardModal(); return; }

  // --- THEME TOGGLE ---
  const themeBtn = e.target.closest('#themeToggle');
  if (themeBtn) { toggleTheme(); return; }

  // --- CLOSE CONFIG ---
  const closeCfg = e.target.closest('#closeConfigBtn');
  if (closeCfg) { closeConfigPanel(); return; }
  if (e.target.id === 'configOverlay') { closeConfigPanel(); return; }

  // --- CONFIG TABS ---
  const cfgTab = e.target.closest('.config-tab');
  if (cfgTab && cfgTab.dataset.config) { setConfigTab(cfgTab.dataset.config); return; }

  // --- CONFIG ICON PICKER ---
  const iconOpt = e.target.closest('#iconPicker .icon-option');
  if (iconOpt) {
    const ic = iconOpt.getAttribute('data-icon');
    document.querySelectorAll('#iconPicker .icon-option').forEach(o => o.classList.remove('selected'));
    iconOpt.classList.add('selected');
    state.baseIcon = ic;
    $('baseIcon').textContent = ic;
    saveToStorage();
    return;
  }

  // --- CONFIG COLOR PICKER ---
  const colorOpt = e.target.closest('#colorPicker .color-option');
  if (colorOpt) {
    const cl = colorOpt.getAttribute('data-color');
    document.querySelectorAll('#colorPicker .color-option').forEach(o => o.classList.remove('selected'));
    colorOpt.classList.add('selected');
    state.baseColor = cl;
    $('baseIcon').style.background = cl;
    saveToStorage();
    return;
  }

  // --- TOGGLE PROPERTY VISIBILITY ---
  const toggleVis = e.target.closest('[data-toggle-vis]');
  if (toggleVis) {
    const key = toggleVis.getAttribute('data-toggle-vis');
    const p = state.properties.find(x => x.key === key);
    if (p) { p.visible = !p.visible; saveToStorage(); renderConfigProperties(); renderConfigVisibility(); renderTable(); }
    return;
  }

  // --- DELETE PROPERTY ---
  const delProp = e.target.closest('[data-delete-prop]');
  if (delProp) {
    const key = delProp.getAttribute('data-delete-prop');
    if (confirm('Excluir esta propriedade?')) {
      state.properties = state.properties.filter(p => p.key !== key);
      saveToStorage();
      renderConfigProperties();
      renderConfigVisibility();
      renderTable();
    }
    return;
  }

  // --- ADD PROPERTY BUTTON ---
  const addPropBtn = e.target.closest('#addPropBtn');
  if (addPropBtn) { openAddPropertyModal(); return; }

  // --- PROP TYPE SELECTION ---
  const propTypeBtn = e.target.closest('.prop-type-btn');
  if (propTypeBtn) {
    const type = propTypeBtn.getAttribute('data-type');
    state.pendingPropType = type;
    document.querySelectorAll('.prop-type-btn').forEach(b => b.classList.remove('selected'));
    propTypeBtn.classList.add('selected');
    $('propSelectOptions').style.display = (type === 'select' || type === 'multiselect') ? 'block' : 'none';
    return;
  }

  // --- CONFIRM ADD PROPERTY ---
  const confAddProp = e.target.closest('#confirmAddPropBtn');
  if (confAddProp) { confirmAddProperty(); return; }

  // --- CANCEL ADD PROPERTY ---
  const cancelAddProp = e.target.closest('#cancelAddPropBtn');
  if (cancelAddProp) { closeModal('addPropModal'); return; }
  const closeAddProp = e.target.closest('#closeAddPropBtn');
  if (closeAddProp) { closeModal('addPropModal'); return; }

  // --- ADD COLUMN BUTTON ---
  const addColBtn = e.target.closest('#addColBtn');
  if (addColBtn) { openAddColumnModal(); return; }

  // --- COLUMN COLOR PICKER ---
  const colColorOpt = e.target.closest('#colColorPicker .color-option');
  if (colColorOpt) {
    const cl = colColorOpt.getAttribute('data-color');
    document.querySelectorAll('#colColorPicker .color-option').forEach(o => o.classList.remove('selected'));
    colColorOpt.classList.add('selected');
    state.pendingColColor = cl;
    return;
  }

  // --- CONFIRM ADD COLUMN ---
  const confAddCol = e.target.closest('#confirmAddColBtn');
  if (confAddCol) { confirmAddColumn(); return; }

  // --- CANCEL ADD COLUMN ---
  const cancelAddCol = e.target.closest('#cancelAddColBtn');
  if (cancelAddCol) { closeModal('addColModal'); return; }
  const closeAddCol = e.target.closest('#closeAddColBtn');
  if (closeAddCol) { closeModal('addColModal'); return; }

  // --- DELETE COLUMN ---
  const delCol = e.target.closest('[data-delete-col]');
  if (delCol) {
    const id = delCol.getAttribute('data-delete-col');
    if (state.columns.length <= 1) { alert('E necessario manter pelo menos uma coluna.'); return; }
    if (confirm('Excluir a coluna \"'+id+'\"?')) {
      state.columns = state.columns.filter(c => c.id !== id);
      saveToStorage();
      renderColConfig();
      renderKanban();
    }
    return;
  }

  // --- EDIT COLUMN ---
  const editCol = e.target.closest('[data-edit-col]');
  if (editCol) {
    const id = editCol.getAttribute('data-edit-col');
    const col = state.columns.find(c => c.id === id);
    if (!col) return;
    const newName = prompt('Novo nome:', col.label);
    if (!newName || !newName.trim()) return;
    col.label = newName.trim();
    col.id = newName.trim();
    saveToStorage();
    renderColConfig();
    renderKanban();
    return;
  }

  // --- SORT SELECTION ---
  const sortItem = e.target.closest('#sortList .prop-reorder-item');
  if (sortItem) {
    const key = sortItem.getAttribute('data-sort-key');
    if (key === state.sort) {
      state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.sort = key;
      state.sortDir = 'asc';
    }
    saveToStorage();
    renderConfigSort();
    renderKanban();
    return;
  }

  // --- GROUP BY SELECTION ---
  const groupByBtn = e.target.closest('[data-group-by]');
  if (groupByBtn) {
    const key = groupByBtn.getAttribute('data-group-by');
    state.grouping = key;
    saveToStorage();
    renderConfigGroupBy();
    renderKanban();
    return;
  }

  // --- COLOR RULES ---
  const ruleColor = e.target.closest('[data-rule-color]');
  if (ruleColor) {
    const idx = parseInt(ruleColor.getAttribute('data-rule-idx'));
    const cl = ruleColor.getAttribute('data-rule-color');
    if (state.colorRules[idx]) { state.colorRules[idx].color = cl; saveToStorage(); renderConfigColorRules(); }
    return;
  }
  const ruleDel = e.target.closest('[data-rule-del]');
  if (ruleDel) {
    const idx = parseInt(ruleDel.getAttribute('data-rule-del'));
    state.colorRules.splice(idx, 1);
    saveToStorage();
    renderConfigColorRules();
    return;
  }
  const addColorRuleBtn = e.target.closest('#addColorRuleBtn');
  if (addColorRuleBtn) {
    state.colorRules.push({prop:'prioridade', value:'Alta', color:'#DC2626'});
    saveToStorage();
    renderConfigColorRules();
    return;
  }

  // --- CARD MODAL ---
  const closeCard = e.target.closest('#closeCardBtn');
  if (closeCard) { closeCardModal(); return; }
  const cancelCard = e.target.closest('#cancelCardBtn');
  if (cancelCard) { closeCardModal(); return; }
  const saveCardBtn = e.target.closest('#saveCardBtn');
  if (saveCardBtn) { saveCard(); return; }
  const deleteCardBtn = e.target.closest('#deleteCardBtn');
  if (deleteCardBtn) { deleteCard(); return; }

  // --- ADD SUBTASK ---
  const addSubBtn = e.target.closest('#addSubtaskBtn');
  if (addSubBtn) {
    const c = getCard(state.editingCardId);
    if (!c) return;
    if (!c.subtarefas) c.subtarefas = [];
    c.subtarefas.push({id:'s'+Date.now(), texto:'Nova subtarefa', done:false});
    renderSubtasks(c);
    return;
  }

  // --- SUBTASK CHECKBOX ---
  const subCheck = e.target.closest('.subtask-checkbox');
  if (subCheck) {
    const c = getCard(state.editingCardId);
    if (!c || !c.subtarefas) return;
    const sid = subCheck.getAttribute('data-sub-id');
    const s = c.subtarefas.find(x => x.id === sid);
    if (s) { s.done = !s.done; renderSubtasks(c); }
    return;
  }

  // --- SUBTASK TEXT CHANGE ---
  const subText = e.target.closest('.subtask-text');
  if (subText && e.type === 'change') {
    const c = getCard(state.editingCardId);
    if (!c || !c.subtarefas) return;
    const sid = subText.getAttribute('data-sub-id');
    const s = c.subtarefas.find(x => x.id === sid);
    if (s) { s.texto = subText.value; }
    return;
  }

  // --- REMOVE SUBTASK ---
  const subRem = e.target.closest('.subtask-remove');
  if (subRem) {
    const c = getCard(state.editingCardId);
    if (!c || !c.subtarefas) return;
    const sid = subRem.getAttribute('data-sub-id');
    c.subtarefas = c.subtarefas.filter(x => x.id !== sid);
    renderSubtasks(c);
    return;
  }

  // --- ADD COMMENT ---
  const addCommentBtn = e.target.closest('#addCommentBtn');
  if (addCommentBtn) {
    const c = getCard(state.editingCardId);
    if (!c) return;
    const txt = $('newCommentText').value.trim();
    if (!txt) return;
    if (!c.comentarios) c.comentarios = [];
    c.comentarios.push({id:'c'+Date.now(), autor:'NC', texto:txt, data:today()});
    $('newCommentText').value = '';
    renderComments(c);
    return;
  }

  // --- NEW CARD MODAL ---
  const closeNewCard = e.target.closest('#closeNewCardBtn');
  if (closeNewCard) { closeModal('newCardModal'); return; }
  const cancelNewCard = e.target.closest('#cancelNewCardBtn');
  if (cancelNewCard) { closeModal('newCardModal'); return; }
  const createCardBtn = e.target.closest('#createCardBtn');
  if (createCardBtn) { createNewCard(); return; }

  // --- FILTER MODAL ---
  const closeFilter = e.target.closest('#closeFilterBtn');
  if (closeFilter) { closeModal('filterModal'); return; }
  const cancelFilter = e.target.closest('#cancelFilterBtn');
  if (cancelFilter) { closeModal('filterModal'); return; }
  const applyFilter = e.target.closest('#applyFilterBtn');
  if (applyFilter) { applyFilters(); return; }
  const clearFilters = e.target.closest('#clearFiltersBtn');
  if (clearFilters) { clearFilters(); return; }
  const addActiveFilter = e.target.closest('#addActiveFilterBtn');
  if (addActiveFilter) {
    state.activeFilters.push({prop:'status', op:'equals', value:'A Fazer'});
    renderActiveFilterBuilder();
    return;
  }

  // --- FILTER CHIP REMOVE ---
  const fiChipRemove = e.target.closest('.filter-chip-remove');
  if (fiChipRemove) {
    const idx = parseInt(fiChipRemove.getAttribute('data-fi'));
    state.activeFilters.splice(idx, 1);
    saveToStorage();
    renderKanban();
    return;
  }

  // --- FILTER BUILDER LIVE UPDATES (delegated) ---
  const fiProp = e.target.closest('[data-fi-prop]');
  if (fiProp) {
    const idx = parseInt(fiProp.getAttribute('data-fi'));
    if (state.activeFilters[idx]) state.activeFilters[idx].prop = fiProp.value;
    return;
  }
  const fiOp = e.target.closest('[data-fi-op]');
  if (fiOp) {
    const idx = parseInt(fiOp.getAttribute('data-fi'));
    if (state.activeFilters[idx]) state.activeFilters[idx].op = fiOp.value;
    return;
  }
  const fiVal = e.target.closest('[data-fi-val]');
  if (fiVal) {
    const idx = parseInt(fiVal.getAttribute('data-fi'));
    if (state.activeFilters[idx]) state.activeFilters[idx].value = fiVal.value;
    return;
  }
  const fiRemove = e.target.closest('[data-fi-remove]');
  if (fiRemove) {
    const idx = parseInt(fiRemove.getAttribute('data-fi-remove'));
    state.activeFilters.splice(idx, 1);
    renderActiveFilterBuilder();
    return;
  }

  // --- TOGGLE SWITCH ---
  const toggleSwitch = e.target.closest('.toggle-switch');
  if (toggleSwitch && toggleSwitch.dataset.toggleVis) {
    const key = toggleSwitch.dataset.toggleVis;
    const p = state.properties.find(x => x.key === key);
    if (p) { p.visible = !p.visible; saveToStorage(); renderConfigProperties(); renderConfigVisibility(); renderTable(); }
    return;
  }

  // --- CLOSE MODALS ON OVERLAY ---
  if (e.target.classList.contains('modal-overlay')) {
    if (e.target.id !== 'cardModal' && e.target.id !== 'newCardModal') {
      e.target.classList.remove('open');
    }
  }
});

// ====================================================================
// INPUT EVENTS (separate from click to avoid conflicts)
// ====================================================================
document.addEventListener('input', function(e) {
  // Subtask text changes
  const subText = e.target.closest('.subtask-text');
  if (subText) {
    const c = getCard(state.editingCardId);
    if (!c || !c.subtarefas) return;
    const sid = subText.getAttribute('data-sub-id');
    const s = c.subtarefas.find(x => x.id === sid);
    if (s) { s.texto = subText.value; }
    return;
  }
  // Filter input changes (live)
  const fiVal = e.target.closest('[data-fi-val]');
  if (fiVal) {
    const idx = parseInt(fiVal.getAttribute('data-fi'));
    if (state.activeFilters[idx]) state.activeFilters[idx].value = fiVal.value;
    return;
  }
  // Search
  if (e.target.id === 'searchInput') {
    state.searchTerm = e.target.value;
    renderKanban();
    return;
  }
});

// ====================================================================
// DRAG EVENTS (card-level, using document listener for stability)
// ====================================================================
document.addEventListener('dragstart', function(e) {
  const card = e.target.closest('.kanban-card');
  if (card) handleDragStart(e);
});
document.addEventListener('dragend', function(e) {
  const card = e.target.closest('.kanban-card');
  if (card) handleDragEnd(e);
});

// ====================================================================
// KEYBOARD
// ====================================================================
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    if ($('cardModal').classList.contains('open')) closeCardModal();
    else if ($('newCardModal').classList.contains('open')) closeModal('newCardModal');
    else if ($('filterModal').classList.contains('open')) closeModal('filterModal');
    else if (state.configOpen) closeConfigPanel();
  }
  if (e.key === 'Enter' && e.ctrlKey && $('newCommentText') && $('newCommentText').value.trim()) {
    const c = getCard(state.editingCardId);
    if (!c) return;
    const txt = $('newCommentText').value.trim();
    if (!c.comentarios) c.comentarios = [];
    c.comentarios.push({id:'c'+Date.now(), autor:'NC', texto:txt, data:today()});
    $('newCommentText').value = '';
    renderComments(c);
  }
});

// ====================================================================
// INIT
// ====================================================================
function init() {
  initData();
  // Set base icon
  if (state.baseIcon) $('baseIcon').textContent = state.baseIcon;
  if (state.baseColor) $('baseIcon').style.background = state.baseColor;
  renderKanban();
}

document.addEventListener('DOMContentLoaded', init);
</script>
</body>
</html>
''')
print("All done - file written successfully")
print("CSS+HEAD done")
