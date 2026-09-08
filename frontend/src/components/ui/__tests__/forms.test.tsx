import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Checkbox, Field, Input, SegmentedControl, Select } from '..';

/**
 * These cover the accessibility contracts the primitives are responsible for —
 * the parts that are invisible when they work and silently broken when they
 * don't, so eyeballing the UI would never catch a regression.
 */

describe('Button', () => {
  it('defaults to type="button" so it cannot accidentally submit a form', () => {
    const onSubmit = jest.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>Not a submit</Button>
      </form>,
    );

    expect(screen.getByRole('button', { name: 'Not a submit' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('blocks interaction and announces itself while loading', async () => {
    const onClick = jest.fn();
    render(
      <Button loading onClick={onClick}>
        Saving
      </Button>,
    );

    const button = screen.getByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('Field', () => {
  it('associates its label with the control', () => {
    render(<Field label="League name">{(field) => <Input {...field} />}</Field>);

    expect(screen.getByLabelText('League name')).toBeInTheDocument();
  });

  it('points aria-describedby at the hint, and at the error once there is one', () => {
    const { rerender } = render(
      <Field label="Email" hint="We never share it.">
        {(field) => <Input {...field} />}
      </Field>,
    );

    const withHint = screen.getByLabelText('Email');
    expect(withHint).not.toHaveAttribute('aria-invalid');
    expect(
      document.getElementById(withHint.getAttribute('aria-describedby')!),
    ).toHaveTextContent('We never share it.');

    rerender(
      <Field label="Email" hint="We never share it." error="That isn't an email.">
        {(field) => <Input {...field} />}
      </Field>,
    );

    const withError = screen.getByLabelText('Email');
    expect(withError).toHaveAttribute('aria-invalid', 'true');
    // The error replaces the hint as the description rather than being
    // appended, so a screen reader is not read stale guidance.
    expect(
      document.getElementById(withError.getAttribute('aria-describedby')!),
    ).toHaveTextContent("That isn't an email.");
    expect(screen.getByRole('alert')).toHaveTextContent("That isn't an email.");
  });
});

describe('Checkbox', () => {
  it('stays a real checkbox, so it is keyboard-operable', async () => {
    const onChange = jest.fn();
    render(<Checkbox label="Include this player" onChange={onChange} />);

    const checkbox = screen.getByRole('checkbox', { name: /include this player/i });
    expect(checkbox).not.toBeChecked();

    await userEvent.tab();
    expect(checkbox).toHaveFocus();

    await userEvent.keyboard(' ');
    expect(onChange).toHaveBeenCalled();
  });
});

describe('Select', () => {
  it('renders a placeholder as a disabled first option', () => {
    render(
      <Select placeholder="Choose a week" defaultValue="">
        <option value="1">Week 1</option>
      </Select>,
    );

    expect(screen.getByRole('option', { name: 'Choose a week' })).toBeDisabled();
  });
});

describe('SegmentedControl', () => {
  it('exposes a radiogroup and moves selection with arrow keys', async () => {
    const Harness = () => {
      const [value, setValue] = React.useState<'WR' | 'RB'>('WR');
      return (
        <SegmentedControl<'WR' | 'RB'>
          label="Player group"
          value={value}
          onChange={setValue}
          options={[
            { value: 'WR', label: 'WR' },
            { value: 'RB', label: 'RB' },
          ]}
        />
      );
    };

    render(<Harness />);

    expect(screen.getByRole('radiogroup', { name: 'Player group' })).toBeInTheDocument();

    const wr = screen.getByRole('radio', { name: 'WR' });
    const rb = screen.getByRole('radio', { name: 'RB' });

    // Roving tabindex: the group is a single tab stop.
    expect(wr).toHaveAttribute('tabindex', '0');
    expect(rb).toHaveAttribute('tabindex', '-1');

    wr.focus();
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByRole('radio', { name: 'RB' })).toBeChecked();
  });
});
