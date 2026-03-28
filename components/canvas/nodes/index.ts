import StartNode from './StartNode';
import EndNode from './EndNode';
import ActionNode from './ActionNode';
import DecisionNode from './DecisionNode';
import HandoffNode from './HandoffNode';
import WaitNode from './WaitNode';
import ErrorNode from './ErrorNode';
import SkillNode from './SkillNode';
import { AgentNode } from '../AgentNode';
import { ContractShieldNode } from './ContractShieldNode';
import { InputSopNode } from './InputSopNode';
import { OutputNode } from './OutputNode';

// Module-scope registration — never define inside a component
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const nodeTypes: Record<string, any> = {
  // ASD node types (from REACTFLOW_CONTRACT.md)
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  decision: DecisionNode,
  handoff: HandoffNode,
  wait: WaitNode,
  error: ErrorNode,
  skill: SkillNode,
  // Contract verification gates between agents
  'contract-shield': ContractShieldNode,
  // Workflow input/output nodes
  'sop-input': InputSopNode,
  'workflow-output': OutputNode,
  // Legacy agent node (existing workflow system)
  agent: AgentNode,
};
