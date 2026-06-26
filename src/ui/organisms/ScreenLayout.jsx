export function ScreenLayout({ children, sx = {} }) {
  return (
    <div style={{ padding: '0 0 110px', animation: 'fu .3s ease', ...sx }}>
      {children}
    </div>
  );
}
