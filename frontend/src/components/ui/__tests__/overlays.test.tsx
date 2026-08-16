import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Menu, MenuItem, Modal, TabPanel, Tabs } from '..';

/**
 * Focus management and keyboard navigation for the overlay primitives.
 *
 * Each of these was found or confirmed by driving a browser during the
 * overhaul; the tests exist so they stay true. The Menu Escape case in
 * particular is a regression test: the handler was originally scoped to the
 * menu list, so opening with a mouse (which leaves focus on the trigger) left
 * no way to close it from the keyboard.
 */

describe('Modal', () => {
  const Harness = ({ onClose = jest.fn() }: { onClose?: () => void }) => {
    const [open, setOpen] = React.useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open dialog</Button>
        <Modal
          open={open}
          onClose={() => {
            setOpen(false);
            onClose();
          }}
          title="Create a league"
          footer={<Button>Create</Button>}
        >
          <input aria-label="League name" />
        </Modal>
      </>
    );
  };

  it('is a labelled modal dialog when open', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Create a league');
  });

  it('moves focus to the first real control, not the close button', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    expect(screen.getByLabelText('League name')).toHaveFocus();
  });

  it('locks background scroll while open and releases it on close', async () => {
    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
    expect(document.body).toHaveStyle({ overflow: 'hidden' });

    await userEvent.keyboard('{Escape}');
    expect(document.body).not.toHaveStyle({ overflow: 'hidden' });
  });

  it('closes on Escape and returns focus to whatever opened it', async () => {
    const onClose = jest.fn();
    render(<Harness onClose={onClose} />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab inside the dialog', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    const dialog = screen.getByRole('dialog');

    // Cycle past the end of the dialog's controls; focus must wrap rather than
    // escaping to the page behind.
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab();
      expect(dialog).toContainElement(document.activeElement as HTMLElement);
    }
  });
});

describe('Tabs', () => {
  const Harness = () => (
    <Tabs
      items={[
        { value: 'overview', label: 'Overview' },
        { value: 'members', label: 'Members' },
        { value: 'settings', label: 'Settings' },
      ]}
      defaultValue="overview"
    >
      <TabPanel value="overview">Overview panel</TabPanel>
      <TabPanel value="members">Members panel</TabPanel>
      <TabPanel value="settings">Settings panel</TabPanel>
    </Tabs>
  );

  it('keeps the whole tablist to one tab stop', () => {
    render(<Harness />);
    const tabbable = screen
      .getAllByRole('tab')
      .filter((tab) => tab.getAttribute('tabindex') === '0');

    expect(tabbable).toHaveLength(1);
    expect(tabbable[0]).toHaveAccessibleName('Overview');
  });

  it('moves selection and focus together with arrow keys', async () => {
    render(<Harness />);

    screen.getByRole('tab', { name: 'Overview' }).focus();
    await userEvent.keyboard('{ArrowRight}');

    const members = screen.getByRole('tab', { name: 'Members' });
    expect(members).toHaveAttribute('aria-selected', 'true');
    expect(members).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Members panel');
  });

  it('wraps from the last tab back to the first', async () => {
    render(<Harness />);

    screen.getByRole('tab', { name: 'Overview' }).focus();
    await userEvent.keyboard('{ArrowLeft}');

    expect(screen.getByRole('tab', { name: 'Settings' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('links each panel to the tab that controls it', async () => {
    render(<Harness />);

    const panel = screen.getByRole('tabpanel');
    const selectedTab = screen.getByRole('tab', { selected: true });

    expect(panel).toHaveAttribute('aria-labelledby', selectedTab.id);
    expect(selectedTab).toHaveAttribute('aria-controls', panel.id);
  });
});

describe('Menu', () => {
  const Harness = ({ onPick = jest.fn() }: { onPick?: () => void }) => (
    <Menu
      trigger={({ ref, ...props }) => (
        <button ref={ref} {...props}>
          Account
        </button>
      )}
    >
      <MenuItem onClick={onPick}>Dashboard</MenuItem>
      <MenuItem>Sign out</MenuItem>
    </Menu>
  );

  it('opens from the keyboard with the first item focused', async () => {
    render(<Harness />);

    screen.getByRole('button', { name: 'Account' }).focus();
    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Dashboard' })).toHaveFocus();
  });

  it('closes on Escape after being opened by mouse, with focus still on the trigger', async () => {
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Account' });
    await userEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();

    // Regression: focus is on the trigger here, not inside the list.
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes when a click lands outside it', async () => {
    render(
      <div>
        <Harness />
        <button>Somewhere else</button>
      </div>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Account' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Somewhere else' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('reflects open state on the trigger', async () => {
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Account' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');

    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});
