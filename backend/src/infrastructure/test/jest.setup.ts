import 'reflect-metadata';

jest.mock('@nestia/core', () => {
  const makeDecorator = () => () => {};

  return {
    TypedRoute: {
      Get: makeDecorator,
      Post: makeDecorator,
      Patch: makeDecorator,
      Delete: makeDecorator,
      Put: makeDecorator,
    },
    TypedParam: makeDecorator,
    TypedQuery: makeDecorator,
    TypedBody: makeDecorator,
  };
});
