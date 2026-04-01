const articleColors = {
  der: 'var(--color-der)',
  die: 'var(--color-die)',
  das: 'var(--color-das)',
};

export default function ArticleButton({ article, onClick, disabled, result }) {
  let className = '';
  let style = {
    flex: 1,
    fontSize: '1.6rem',
    padding: '24px 20px',
    background: articleColors[article],
    color: 'white',
    opacity: disabled && !result ? 0.6 : 1,
    borderRadius: '20px',
    textTransform: 'lowercase',
    letterSpacing: '1px',
  };

  if (result === 'correct') {
    className = 'anim-correct';
    style.background = 'var(--color-correct)';
    style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.5)';
  } else if (result === 'wrong') {
    className = 'anim-wrong';
    style.background = 'var(--color-wrong)';
    style.boxShadow = '0 0 20px rgba(244, 67, 54, 0.5)';
  } else if (result === 'timeout') {
    className = 'anim-timeout';
    style.background = 'var(--color-timeout)';
  } else if (result === 'correct-highlight') {
    style.background = 'var(--color-correct)';
    style.outline = '3px solid var(--color-correct)';
    style.outlineOffset = '2px';
    style.boxShadow = '0 0 20px rgba(76, 175, 80, 0.5)';
  }

  return (
    <button className={className} style={style} onClick={() => onClick(article)} disabled={disabled}>
      {article}
    </button>
  );
}
