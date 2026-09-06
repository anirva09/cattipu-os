import type { CSSProperties, HTMLAttributes } from 'react';

import { cattipuCssVariables } from '../../design-system/tokens';

import {
  FolderTreeItem,
  type FolderTreeNode,
} from '../FolderTreeItem/FolderTreeItem';

import './FolderTree.css';

export const CATTIPU_FOLDER_TREE_REFERENCE = {
  paddingTop: 12,
} as const;

type FolderTreeStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface FolderTreeProps
  // `onSelect` is also a DOM event handler on HTMLAttributes, with an
  // incompatible signature — omitted here so the tree's own (id: string)
  // callback wins. Integration fix only; the component's API is unchanged.
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onSelect'> {
  nodes: readonly FolderTreeNode[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function FolderTree({
  nodes,
  selectedId,
  onSelect,
  className,
  style,
  ...divProps
}: FolderTreeProps) {
  const treeStyle: FolderTreeStyle = {
    ...cattipuCssVariables,
    '--cattipu-folder-tree-padding-top': `${CATTIPU_FOLDER_TREE_REFERENCE.paddingTop}px`,
    ...style,
  };

  return (
    <div
      {...divProps}
      className={[
        'cattipu-folder-tree',
        className,
      ].filter(Boolean).join(' ')}
      style={treeStyle}
      role="tree"
      aria-label={divProps['aria-label'] ?? 'Project folders'}
    >
      {nodes.map((node) => (
        <FolderTreeItem
          key={node.id}
          node={node}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export type { FolderTreeNode };
