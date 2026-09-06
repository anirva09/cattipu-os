import type { CSSProperties, HTMLAttributes } from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import { ProgressBar } from '../ProgressBar/ProgressBar';

import '../../design-system/bevel.css';
import './ProjectCard.css';

export const CATTIPU_PROJECT_CARD_REFERENCE = {
  height: 76,
  paddingX: cattipuTokens.spacing[12],
  paddingY: cattipuTokens.spacing[8],
  folderWidth: 52,
  folderHeight: 48,
  columnGap: cattipuTokens.spacing[8],
  titleSize: cattipuTokens.type.windowTitle,
  metadataSize: cattipuTokens.type.body,
  progressValueSize: cattipuTokens.type.windowTitle,
} as const;

type ProjectCardStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface ProjectCardProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  name: string;
  version: string;
  updated: string;
  owner: string;
  progress: number;
}

function FolderCardGlyph() {
  return (
    <svg
      className="cattipu-project-card__folder"
      viewBox="0 0 52 48"
      aria-hidden="true"
    >
      <path d="M2 12h18l4-6h12l4 6h10v32H2Z" />
      <path className="cattipu-project-card__folder-highlight" d="M4 14h44M4 14v27" />
    </svg>
  );
}

export function ProjectCard({
  name,
  version,
  updated,
  owner,
  progress,
  className,
  style,
  ...articleProps
}: ProjectCardProps) {
  const cardStyle: ProjectCardStyle = {
    ...cattipuCssVariables,
    '--cattipu-project-card-height': `${CATTIPU_PROJECT_CARD_REFERENCE.height}px`,
    '--cattipu-project-card-padding-x': `${CATTIPU_PROJECT_CARD_REFERENCE.paddingX}px`,
    '--cattipu-project-card-padding-y': `${CATTIPU_PROJECT_CARD_REFERENCE.paddingY}px`,
    '--cattipu-project-card-folder-width': `${CATTIPU_PROJECT_CARD_REFERENCE.folderWidth}px`,
    '--cattipu-project-card-folder-height': `${CATTIPU_PROJECT_CARD_REFERENCE.folderHeight}px`,
    '--cattipu-project-card-gap': `${CATTIPU_PROJECT_CARD_REFERENCE.columnGap}px`,
    '--cattipu-project-card-title-size': `${CATTIPU_PROJECT_CARD_REFERENCE.titleSize}px`,
    '--cattipu-project-card-metadata-size': `${CATTIPU_PROJECT_CARD_REFERENCE.metadataSize}px`,
    '--cattipu-project-card-progress-size': `${CATTIPU_PROJECT_CARD_REFERENCE.progressValueSize}px`,
    '--cattipu-project-card-folder': cattipuTokens.colors.welcome,
    ...style,
  };

  return (
    <article
      {...articleProps}
      className={[
        'cattipu-project-card',
        'cattipu-bevel--raised',
        className,
      ].filter(Boolean).join(' ')}
      style={cardStyle}
    >
      <span className="cattipu-project-card__icon">
        <FolderCardGlyph />
      </span>

      <span className="cattipu-project-card__copy">
        <strong className="cattipu-project-card__title">
          {name} ({version})
        </strong>
        <span className="cattipu-project-card__metadata">
          {updated} by {owner}
        </span>
      </span>

      <strong className="cattipu-project-card__progress-value">
        {Math.max(0, Math.min(100, progress))}%
      </strong>

      <ProgressBar
        value={progress}
        label={`${name} project progress`}
      />
    </article>
  );
}
