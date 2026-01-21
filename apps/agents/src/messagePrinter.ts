import { SDKAssistantMessage, SDKAuthStatusMessage, SDKMessage, SDKPartialAssistantMessage, SDKResultMessage, SDKSystemMessage, SDKToolProgressMessage, SDKUserMessage } from "@anthropic-ai/claude-agent-sdk";

export function printClaudeMessage(message: SDKMessage) {
  //  "assistant" | "user" | "result" | "system" | "stream_event" | "tool_progress" | "auth_status"
  switch (message.type) {
    case 'assistant':
      printAssistantMessage(message as SDKAssistantMessage);
      break;
    case 'user':
      printUserMessage(message as SDKUserMessage);
      break;
    case 'result':
      printResultMessage(message as SDKResultMessage);
      break;
    case 'system': 
      printSystemMessage(message as SDKSystemMessage);
      break;
    case 'stream_event':
      printStreamEvent(message as SDKPartialAssistantMessage);
      break;
    case 'tool_progress':
      printToolProgress(message as SDKToolProgressMessage);
      break;
    case 'auth_status':
      printAuthStatus(message as SDKAuthStatusMessage);
      break;
    default:
      console.warn('unknown message type', message);
  }
}

function printAssistantMessage(message: SDKAssistantMessage) {
  const m = message.message;
  if (m.content && Array.isArray(m.content)) {
    m.content.forEach(c => {
      // Tools
      if (c.type === 'tool_use') {
        console.log(`🔧 Tool call: ${c.name}`);
        return;
      }
      // Text
      if (c.type === 'text') {
        console.log(`💬 Assistant: ${c.text}`);
        return;
      }
      // Other
      console.log(`💬 Assistant (other content type: ${c.type})`);
      console.log(c);
    })
  }
}

function printUserMessage(message: SDKUserMessage) {
  const m = message.message;
  if (m.content && Array.isArray(m.content)) {
    m.content.forEach(c => {
      // Tools
      if (c.type === 'tool_result') {
        // Skip
        console.log(`🔧 Tool result received`);
        return;
      }
      // Text
      if (c.type === 'text') {
        console.log(`👤 User: ${c.text}`);
        return;
      }
      // Other
      console.log(`👤 User (other content type: ${c.type})`);
      console.log(c);
    })
  }}

function printResultMessage(message: SDKResultMessage) {
  // A success message means the agent's turn is complete
  if (message.subtype === 'success' && message.result && typeof message.result === 'string') {
    console.log(`\n--- Agent turn complete ---`);
    console.log(message.result);
    console.log(`---------------------------\n`);
    return;
  }
  console.log(`✅ success message received`);
}

function printSystemMessage(message: SDKSystemMessage) {
  if (message.subtype === 'init') {
    console.log("Starting Claude")
    console.log(`- Permissions: ${message.permissionMode}`);
    console.log(`- Tools: ${message.tools.length}`);
    console.log(`- MCP Servers: ${message.mcp_servers.length}`);
    console.log(`- Slash commands: ${message.slash_commands.length}`);
    console.log(`- Skills: ${message.skills.length}`);
    console.log(`- Plugins: ${message.plugins.length}`);
    console.log(`- Agents: ${message.agents?.length || 0}`);
  } else {
    console.log(`system message`);
    console.log(message);
  }
}

function printStreamEvent(message: SDKPartialAssistantMessage) {
  console.log(`stream event message`);
  console.log(message);
}

function printToolProgress(message: SDKToolProgressMessage) {
  console.log(`tool progress message`);
  console.log(message);
}

function printAuthStatus(message: SDKAuthStatusMessage) {
  console.log(`auth status message`);
  console.log(message);
}