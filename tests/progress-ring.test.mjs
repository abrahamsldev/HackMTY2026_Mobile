import assert from 'node:assert/strict';
import { test } from 'node:test';
import { progressRingPropsSchema, ringGeometry, ringProgress, ringTone } from '../src/components/charts/progress-ring-model.ts';

const base = { value: 3200, max: 8000, label: 'Alimentos' };

test('ring schema accepts a ratio against a limit and rejects a zero limit, negatives and unknown props', () => {
  const parsed = progressRingPropsSchema.safeParse(base);
  assert.ok(parsed.success);
  assert.equal(parsed.data.intent, 'spend');
  assert.equal(parsed.data.warnAt, 0.8);
  assert.equal(parsed.data.size, 'md');
  for (const patch of [{ max: 0 }, { value: -1 }, { max: -5 }, { label: '   ' }, { warnAt: 1.5 }, { intent: 'other' }, { style: {} }, { onPress: () => {} }]) {
    assert.equal(progressRingPropsSchema.safeParse({ ...base, ...patch }).success, false, JSON.stringify(patch));
  }
  assert.equal(progressRingPropsSchema.safeParse({ ...base, value: Infinity }).success, false);
});

test('progress reports the true percentage but never draws past a full turn', () => {
  assert.deepEqual(ringProgress(4000, 8000), { percentage: 50, fraction: 0.5, remaining: 4000 });
  const over = ringProgress(9600, 8000);
  assert.equal(over.percentage, 120);
  assert.equal(over.fraction, 1);
  assert.equal(over.remaining, -1600);
  assert.equal(ringProgress(0, 8000).fraction, 0);
});

test('spend rings escalate at the warning threshold and past the limit; goal rings only celebrate the target', () => {
  const spend = (value, warnAt = 0.8) => ringTone({ value, max: 100, intent: 'spend', warnAt });
  assert.equal(spend(10), 'default');
  assert.equal(spend(79.9), 'default');
  assert.equal(spend(80), 'warning');
  assert.equal(spend(100), 'warning');
  assert.equal(spend(100.1), 'danger');
  assert.equal(spend(95, 0.5), 'warning');

  const goal = (value) => ringTone({ value, max: 100, intent: 'goal', warnAt: 0.8 });
  assert.equal(goal(0), 'default');
  assert.equal(goal(99), 'default');
  assert.equal(goal(100), 'success');
  // Overshooting a goal is still success, never danger.
  assert.equal(goal(140), 'success');
});

test('ring geometry keeps the stroke inside the box and the dash length equal to the circumference', () => {
  const { radius, circumference, center } = ringGeometry(104, 10);
  assert.equal(center, 52);
  assert.equal(radius, 47);
  assert.ok(Math.abs(circumference - 2 * Math.PI * 47) < 1e-9);
  // The outer edge of the stroke must not exceed the box.
  assert.ok(radius + 10 / 2 <= 52);
});
