import FlowEdge from './FlowEdge';
import DecisionTrueEdge from './DecisionTrueEdge';
import DecisionFalseEdge from './DecisionFalseEdge';
import ErrorEdge from './ErrorEdge';
import HandoffEdge from './HandoffEdge';
import SkillBindingEdge from './SkillBindingEdge';

// Module-scope registration — never define inside a component
export const edgeTypes = {
  flow: FlowEdge,
  'decision-true': DecisionTrueEdge,
  'decision-false': DecisionFalseEdge,
  error: ErrorEdge,
  handoff: HandoffEdge,
  'skill-binding': SkillBindingEdge,
} as const;
