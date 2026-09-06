import type { CSSProperties } from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import './FolderTreeItem.css';

export type FolderTreeItemKind = 'folder' | 'project';

export interface FolderTreeNode {
  id: string;
  label: string;
  kind: FolderTreeItemKind;
  expanded?: boolean;
  children?: readonly FolderTreeNode[];
}

export const CATTIPU_FOLDER_TREE_ITEM_REFERENCE = {
  rowHeight: 30,
  iconSize: 24,
  indentStep: cattipuTokens.spacing[24],
  rootInset: cattipuTokens.spacing[8],
  iconGap: cattipuTokens.spacing[8],
  labelSize: cattipuTokens.type.body,
} as const;

type FolderTreeItemStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface FolderTreeItemProps {
  node: FolderTreeNode;
  depth?: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

function FolderGlyph() {
  return (
    <svg
      className="cattipu-folder-tree-item__folder-glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M2 7h7l2-3h5l2 3h4v13H2Z" />
      <path className="cattipu-folder-tree-item__glyph-highlight" d="M3 8h18M3 8v10" />
    </svg>
  );
}

function ProjectGlyph() {
  return (
    <svg
      className="cattipu-folder-tree-item__project-glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M5 2h10l4 4v16H5Z" />
      <path d="M15 2v5h4" />
      <path className="cattipu-folder-tree-item__glyph-detail" d="M8 11h8M8 15h8" />
    </svg>
  );
}

export function FolderTreeItem({
  node,
  depth = 0,
  selectedId,
  onSelect,
}: FolderTreeItemProps) {
  const selected = node.id === selectedId;
  const indent =
    CATTIPU_FOLDER_TREE_ITEM_REFERENCE.rootInset +
    depth * CATTIPU_FOLDER_TREE_ITEM_REFERENCE.indentStep;

  const itemStyle: FolderTreeItemStyle = {
    ...cattipuCssVariables,
    '--cattipu-tree-row-height': `${CATTIPU_FOLDER_TREE_ITEM_REFERENCE.rowHeight}px`,
    '--cattipu-tree-icon-size': `${CATTIPU_FOLDER_TREE_ITEM_REFERENCE.iconSize}px`,
    '--cattipu-tree-indent': `${indent}px`,
    '--cattipu-tree-icon-gap': `${CATTIPU_FOLDER_TREE_ITEM_REFERENCE.iconGap}px`,
    '--cattipu-tree-label-size': `${CATTIPU_FOLDER_TREE_ITEM_REFERENCE.labelSize}px`,
    '--cattipu-tree-folder': cattipuTokens.colors.welcome,
    ...{},
  };

  const hasChildren = Boolean(node.children?.length);
  const expanded = node.expanded !== false;

  return (
    <div
      className="cattipu-folder-tree-item"
      role="treeitem"
      aria-selected={selected}
      aria-expanded={hasChildren ? expanded : undefined}
      style={itemStyle}
      data-depth={depth}
    >
      <button
        type="button"
        className="cattipu-folder-tree-item__row"
        data-selected={selected ? 'true' : 'false'}
        onClick={() => onSelect?.(node.id)}
      >
        <span className="cattipu-folder-tree-item__icon" aria-hidden="true">
          {node.kind === 'folder' ? <FolderGlyph /> : <ProjectGlyph />}
        </span>
        <span className="cattipu-folder-tree-item__label">{node.label}</span>
      </button>

      {hasChildren && expanded ? (
        <div className="cattipu-folder-tree-item__children" role="group">
          {node.children?.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
