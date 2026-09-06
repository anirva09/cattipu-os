import type { CSSProperties, HTMLAttributes } from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import './DetailsPanel.css';

export interface ProjectDetails {
  name: string;
  location: string;
  type: string;
  owner: string;
  created: string;
  notes: string;
}

export const CATTIPU_DETAILS_PANEL_REFERENCE = {
  padding: cattipuTokens.spacing[12],
  titleSize: cattipuTokens.type.windowTitle,
  labelWidth: 88,
  rowHeight: 28,
  bodySize: cattipuTokens.type.body,
  ruleHeight: cattipuTokens.geometry.border,
} as const;

type DetailsPanelStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface DetailsPanelProps
  extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  details: ProjectDetails;
}

export function DetailsPanel({
  details,
  className,
  style,
  ...sectionProps
}: DetailsPanelProps) {
  const panelStyle: DetailsPanelStyle = {
    ...cattipuCssVariables,
    '--cattipu-details-padding': `${CATTIPU_DETAILS_PANEL_REFERENCE.padding}px`,
    '--cattipu-details-title-size': `${CATTIPU_DETAILS_PANEL_REFERENCE.titleSize}px`,
    '--cattipu-details-label-width': `${CATTIPU_DETAILS_PANEL_REFERENCE.labelWidth}px`,
    '--cattipu-details-row-height': `${CATTIPU_DETAILS_PANEL_REFERENCE.rowHeight}px`,
    '--cattipu-details-body-size': `${CATTIPU_DETAILS_PANEL_REFERENCE.bodySize}px`,
    '--cattipu-details-rule-height': `${CATTIPU_DETAILS_PANEL_REFERENCE.ruleHeight}px`,
    ...style,
  };

  return (
    <section
      {...sectionProps}
      className={[
        'cattipu-details-panel',
        className,
      ].filter(Boolean).join(' ')}
      style={panelStyle}
      aria-label={`${details.name} details`}
    >
      <h2 className="cattipu-details-panel__title">{details.name}</h2>
      <div className="cattipu-details-panel__rule" aria-hidden="true" />

      <dl className="cattipu-details-panel__fields">
        <dt>LOCATION:</dt>
        <dd>{details.location}</dd>

        <dt>TYPE:</dt>
        <dd>{details.type}</dd>

        <dt>OWNER:</dt>
        <dd>{details.owner}</dd>

        <dt>CREATED:</dt>
        <dd>{details.created}</dd>

        <dt>NOTES:</dt>
        <dd>{details.notes}</dd>
      </dl>
    </section>
  );
}
