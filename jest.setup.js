// jest.setup.js
import '@testing-library/jest-dom/extend-expect';

// Mock Next.js dynamic imports to avoid SSR warnings in tests
jest.mock('next/dynamic', () => (importFn) => {
  const Component = React.lazy(importFn);
  return (props) => <Component {...props} />;
});
