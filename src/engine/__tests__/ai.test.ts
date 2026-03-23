import { describe, it, expect } from 'vitest';
import { parseAIResponse } from '../ai';

describe('parseAIResponse', () => {
  it('parses valid JSON response', () => {
    const input = JSON.stringify({
      message: 'Created a task for you!',
      actions: [{ type: 'create', data: { title: 'Buy milk', priority: 'medium' } }],
    });
    const result = parseAIResponse(input);
    expect(result.message).toBe('Created a task for you!');
    expect(result.actions).toHaveLength(1);
    expect(result.actions[0].type).toBe('create');
    expect(result.actions[0].data?.title).toBe('Buy milk');
  });

  it('strips markdown fences from response', () => {
    const input = '```json\n{"message":"Hello","actions":[]}\n```';
    const result = parseAIResponse(input);
    expect(result.message).toBe('Hello');
    expect(result.actions).toEqual([]);
  });

  it('handles response with no actions', () => {
    const input = JSON.stringify({ message: 'Sure, I can help!', actions: [] });
    const result = parseAIResponse(input);
    expect(result.message).toBe('Sure, I can help!');
    expect(result.actions).toEqual([]);
  });

  it('handles multiple actions', () => {
    const input = JSON.stringify({
      message: 'Added both tasks!',
      actions: [
        { type: 'create', data: { title: 'Task 1' } },
        { type: 'create', data: { title: 'Task 2' } },
      ],
    });
    const result = parseAIResponse(input);
    expect(result.actions).toHaveLength(2);
  });

  it('falls back to plain text message on invalid JSON', () => {
    const input = 'Sorry, I could not understand that request.';
    const result = parseAIResponse(input);
    expect(result.message).toBe('Sorry, I could not understand that request.');
    expect(result.actions).toEqual([]);
  });

  it('handles missing actions field', () => {
    const input = JSON.stringify({ message: 'Hello' });
    const result = parseAIResponse(input);
    expect(result.message).toBe('Hello');
    expect(result.actions).toEqual([]);
  });

  it('handles missing message field', () => {
    const input = JSON.stringify({ actions: [{ type: 'create', data: { title: 'X' } }] });
    const result = parseAIResponse(input);
    expect(result.message).toBe('');
    expect(result.actions).toHaveLength(1);
  });

  it('handles complete action with actualEffort', () => {
    const input = JSON.stringify({
      message: 'Marked as done!',
      actions: [{ type: 'complete', taskId: 'abc', data: { actualEffort: 45 } }],
    });
    const result = parseAIResponse(input);
    expect(result.actions[0].type).toBe('complete');
    expect(result.actions[0].taskId).toBe('abc');
    expect(result.actions[0].data?.actualEffort).toBe(45);
  });

  it('handles decompose action with subtasks', () => {
    const input = JSON.stringify({
      message: 'Broken down into subtasks!',
      actions: [{
        type: 'decompose',
        taskId: 'parent-1',
        subtasks: [
          { title: 'Step 1', effort: 30 },
          { title: 'Step 2', effort: 60 },
        ],
      }],
    });
    const result = parseAIResponse(input);
    expect(result.actions[0].type).toBe('decompose');
    expect(result.actions[0].subtasks).toHaveLength(2);
  });

  it('handles whitespace around JSON', () => {
    const input = '  \n  {"message":"Trimmed","actions":[]}  \n  ';
    const result = parseAIResponse(input);
    expect(result.message).toBe('Trimmed');
  });
});
