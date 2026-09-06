import type { CSSProperties } from 'react';

import {
  cattipuCssVariables,
  cattipuTokens,
} from '../../design-system/tokens';

import {
  Window,
  type WindowProps,
} from '../Window/Window';

import {
  FolderTree,
  type FolderTreeNode,
} from '../FolderTree/FolderTree';

import {
  ProjectCard,
  type ProjectCardProps,
} from '../ProjectCard/ProjectCard';

import {
  DetailsPanel,
  type ProjectDetails,
} from '../DetailsPanel/DetailsPanel';

import { DividerGroove } from '../DividerGroove/DividerGroove';

import './ProjectsWindow.css';

export const CATTIPU_PROJECTS_WINDOW_REFERENCE = {
  width: cattipuTokens.geometry.windowReferenceWidth,
  height: cattipuTokens.geometry.windowReferenceHeight,
  bodyWidth: 904,
  bodyHeight: 558,
  treeWidth: 248,
  dividerSize: 16,
  rightWidth: 640,
  projectListHeight: 280,
  detailsHeight: 262,
  projectListPadding: cattipuTokens.spacing[12],
  projectCardGap: cattipuTokens.spacing[12],
} as const;

export interface ProjectsWindowProject
  extends Pick<
    ProjectCardProps,
    'name' | 'version' | 'updated' | 'owner' | 'progress'
  > {
  id: string;
}

type ProjectsWindowStyle = CSSProperties &
  Record<`--cattipu-${string}`, string>;

export interface ProjectsWindowProps
  extends Omit<WindowProps, 'title' | 'tone' | 'children'> {
  treeNodes?: readonly FolderTreeNode[];
  projects?: readonly ProjectsWindowProject[];
  details?: ProjectDetails;
  selectedTreeId?: string;
  onTreeSelect?: (id: string) => void;
}

export const CATTIPU_PROJECTS_TREE: readonly FolderTreeNode[] = [
  {
    id: 'projects-root',
    label: 'CATTIPU/PROJECTS',
    kind: 'folder',
    children: [
      {
        id: 'active',
        label: 'Active',
        kind: 'folder',
        children: [
          {
            id: 'banking-platform',
            label: 'Banking Platform',
            kind: 'project',
          },
          {
            id: 'ai-saas-starter',
            label: 'AI SaaS Starter',
            kind: 'project',
          },
          {
            id: 'cattipu-website',
            label: 'CATTIPU Website',
            kind: 'project',
          },
        ],
      },
      {
        id: 'archived',
        label: 'Archived',
        kind: 'folder',
      },
      {
        id: 'templates',
        label: 'Templates',
        kind: 'folder',
      },
      {
        id: 'samples',
        label: 'Samples',
        kind: 'folder',
      },
    ],
  },
];

export const CATTIPU_PROJECTS_LIST: readonly ProjectsWindowProject[] = [
  {
    id: 'banking-platform',
    name: 'Banking Platform',
    version: 'v1.0.0',
    updated: '29 Aug 12:36 am',
    owner: 'node',
    progress: 82,
  },
  {
    id: 'ai-saas-starter',
    name: 'AI SaaS Starter',
    version: 'v1.0.0',
    updated: '28 Aug 09:18 am',
    owner: 'node',
    progress: 64,
  },
  {
    id: 'cattipu-website',
    name: 'CATTIPU Website',
    version: 'v1.1.0',
    updated: '27 Aug 04:52 am',
    owner: 'node',
    progress: 71,
  },
];

export const CATTIPU_PROJECTS_DETAILS: ProjectDetails = {
  name: 'Banking Platform',
  location: '\\\\CATTIPU\\PROJECTS\\Active\\Banking Platform\\v1.6.0',
  type: 'Application Platform',
  owner: 'node',
  created: '14 Aug 1996 09:22 am',
  notes: 'Core banking platform with modular services.',
};

export function ProjectsWindow({
  treeNodes = CATTIPU_PROJECTS_TREE,
  projects = CATTIPU_PROJECTS_LIST,
  details = CATTIPU_PROJECTS_DETAILS,
  selectedTreeId = 'banking-platform',
  onTreeSelect,
  style,
  ...windowProps
}: ProjectsWindowProps) {
  const projectsWindowStyle: ProjectsWindowStyle = {
    ...cattipuCssVariables,
    '--cattipu-projects-tree-width': `${CATTIPU_PROJECTS_WINDOW_REFERENCE.treeWidth}px`,
    '--cattipu-projects-divider-size': `${CATTIPU_PROJECTS_WINDOW_REFERENCE.dividerSize}px`,
    '--cattipu-projects-right-width': `${CATTIPU_PROJECTS_WINDOW_REFERENCE.rightWidth}px`,
    '--cattipu-projects-list-height': `${CATTIPU_PROJECTS_WINDOW_REFERENCE.projectListHeight}px`,
    '--cattipu-projects-details-height': `${CATTIPU_PROJECTS_WINDOW_REFERENCE.detailsHeight}px`,
    '--cattipu-projects-list-padding': `${CATTIPU_PROJECTS_WINDOW_REFERENCE.projectListPadding}px`,
    '--cattipu-projects-card-gap': `${CATTIPU_PROJECTS_WINDOW_REFERENCE.projectCardGap}px`,
    ...style,
  };

  return (
    <Window
      {...windowProps}
      title="Projects"
      tone="projects"
      width={CATTIPU_PROJECTS_WINDOW_REFERENCE.width}
      height={CATTIPU_PROJECTS_WINDOW_REFERENCE.height}
      style={projectsWindowStyle}
    >
      <div className="cattipu-projects-window">
        <FolderTree
          nodes={treeNodes}
          selectedId={selectedTreeId}
          onSelect={onTreeSelect}
        />

        <DividerGroove orientation="vertical" />

        <div className="cattipu-projects-window__right">
          <div className="cattipu-projects-window__project-list">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                name={project.name}
                version={project.version}
                updated={project.updated}
                owner={project.owner}
                progress={project.progress}
              />
            ))}
          </div>

          <DividerGroove orientation="horizontal" />

          <DetailsPanel details={details} />
        </div>
      </div>
    </Window>
  );
}
