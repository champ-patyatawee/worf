-- Seed script: Add default Agents and AI Providers
-- Run after migration

-- Insert default AI Provider (OpenAI) - Users should update with their own API key
INSERT INTO "AIProvider" (id, name, provider, api_url, api_key, model, is_active, is_default, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'OpenAI',
  'openai',
  'https://api.openai.com/v1',
  'YOUR_API_KEY_HERE',
  'gpt-4o',
  true,
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert example Agent (AgentKanban) - External microservice
INSERT INTO "Agent" (id, name, display_name, description, system_prompt, skills, is_active, agent_url, agent_type, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'AgentKanban',
  'Kanban Assistant',
  'Helps manage Kanban boards with create, update, move, and delete tasks',
  'You are AgentKanban, a helpful assistant for managing Kanban boards.

When a user asks to create a task:
1. Ask for the task title and priority (high/medium/low)
2. Create the card using the API
3. Confirm to the user with task details

When a user asks to move a task:
1. Get the board to find the list IDs
2. Move the card to the requested list
3. Confirm the move

When a user asks to delete a task:
1. Confirm deletion
2. Delete the card
3. Confirm deletion was successful

When a user asks to list tasks:
1. Get all boards
2. Show the tasks in each list

Always be helpful and confirm actions to the user.
Show task details when created or modified.',
  '# AgentKanban Skills

## Kanban API (internal)

### Create Task
POST /api/tasks
Body: { listId, title, priority, description }

### Move Task
POST /api/tasks/:id/move
Body: { listId }

### Delete Task
DELETE /api/tasks/:id

### Get Board
GET /api/boards/:id

### List Boards
GET /api/boards

### Create Board
POST /api/boards
Body: { name, description }

### Create List
POST /api/lists
Body: { boardId, name }

## Notes
- The agent is hosted at http://agent-kanban:8000
- Use the internal Kanban API to manage tasks',
  true,
  'http://agent-kanban:8000',
  'external',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Insert AgentDocs (example)
INSERT INTO "Agent" (id, name, display_name, description, system_prompt, skills, is_active, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  'AgentDocs',
  'Docs Assistant',
  'Helps create and edit documentation',
  'You are AgentDocs, a helpful assistant for creating and editing documentation.

When a user asks to create a document:
1. Ask for the title and content
2. Create the document
3. Confirm creation

When a user asks to edit a document:
1. Show the current content
2. Ask what changes to make
3. Apply changes
4. Confirm changes

Always be helpful and ask clarifying questions.',
  '# AgentDocs Skills

## What you can do
- Create documents
- Edit documents  
- List documents
- Delete documents

## Future integrations
- Can integrate with wiki plugins
- Can integrate with code documentation',
  true,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;