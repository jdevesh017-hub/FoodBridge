import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { EmptyState, EmptyStateVariant } from '../components/common/EmptyState';

describe('EmptyState Component', () => {
  const allVariants: EmptyStateVariant[] = [
    'donor-donations',
    'donor-history',
    'ngo-discover',
    'ngo-reservations',
    'ngo-deliveries',
    'volunteer-tasks',
    'volunteer-active',
    'volunteer-history',
  ];

  it('renders all 8 empty state variants to static markup without throwing', () => {
    for (const variant of allVariants) {
      const html = renderToString(
        <EmptyState
          variant={variant}
          title={`Title for ${variant}`}
          description={`Description for ${variant}`}
          actionText="Take Action"
          onAction={() => {}}
        />
      );
      expect(html).toContain(`Title for ${variant}`);
      expect(html).toContain(`Description for ${variant}`);
      expect(html).toContain('Take Action');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('role="status"');
    }
  });

  it('renders secondary action when provided', () => {
    const html = renderToString(
      <EmptyState
        variant="donor-donations"
        title="Ready to share?"
        description="Connect with shelters"
        actionText="Log Surplus Batch"
        onAction={() => {}}
        secondaryActionText="Reset Filter"
        onSecondaryAction={() => {}}
      />
    );
    expect(html).toContain('Log Surplus Batch');
    expect(html).toContain('Reset Filter');
  });
});
