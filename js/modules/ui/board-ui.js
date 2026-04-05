const SPRITES = Object.freeze({
  white: {
    man: './assets/img/piece_white.webp',
    king: './assets/img/piece_white_king.webp',
    fallbackMan: './assets/img/piece-white.svg',
    fallbackKing: './assets/img/piece-white-king.svg'
  },
  black: {
    man: './assets/img/piece_black.webp',
    king: './assets/img/piece_black_king.webp',
    fallbackMan: './assets/img/piece-black.svg',
    fallbackKing: './assets/img/piece-black-king.svg'
  }
});

function keyOf(row, col) {
  return `${row}:${col}`;
}

export class BoardUI {
  constructor(boardEl, onCellClick) {
    this.boardEl = boardEl;
    this.onCellClick = onCellClick;
    this.bound = false;
  }

  mount() {
    if (this.bound) return;
    this.bound = true;

    this.boardEl.addEventListener('click', (ev) => {
      const cell = ev.target.closest('.cell');
      if (!cell || !this.boardEl.contains(cell)) return;

      const row = Number(cell.dataset.r);
      const col = Number(cell.dataset.c);
      if (Number.isNaN(row) || Number.isNaN(col)) return;

      this.onCellClick(row, col);
    });
  }

  render({ board, selected, highlightedMoves, effects = null }) {
    this.boardEl.innerHTML = '';

    const selectedKey = selected ? keyOf(selected[0], selected[1]) : null;
    const moveMap = new Map(
      highlightedMoves.map((mv) => [keyOf(mv.to[0], mv.to[1]), mv])
    );

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const cell = document.createElement('button');
        cell.type = 'button';
        cell.className = 'cell';
        cell.classList.add((row + col) % 2 === 0 ? 'light' : 'dark');
        if ((row + col) % 2 === 1) cell.classList.add('playable');
        cell.dataset.r = String(row);
        cell.dataset.c = String(col);

        const cellKey = keyOf(row, col);
        if (cellKey === selectedKey) cell.classList.add('selected');
        if (effects?.from && effects.from[0] === row && effects.from[1] === col) cell.classList.add('fx-from');
        if (effects?.to && effects.to[0] === row && effects.to[1] === col) cell.classList.add('fx-to');
        if (effects?.capture && effects.capture[0] === row && effects.capture[1] === col) cell.classList.add('fx-capture');

        const hint = moveMap.get(cellKey);
        if (hint) {
          cell.classList.add('move');
          if (hint.capture) cell.classList.add('capture');
        }

        const piece = board[row][col];
        if (piece) {
          const spriteSet = SPRITES[piece.color];
          const useKingSprite = piece.king ? spriteSet.king : spriteSet.man;
          const fallbackSprite = piece.king ? spriteSet.fallbackKing : spriteSet.fallbackMan;

          const img = document.createElement('img');
          img.className = 'piece-img';
          img.classList.add(piece.color === 'white' ? 'piece-white' : 'piece-black');
          if (piece.king) img.classList.add('piece-king');
          img.alt = piece.king ? `Dama ${piece.color}` : `Peca ${piece.color}`;
          img.draggable = false;
          img.src = useKingSprite;
          img.addEventListener('error', () => {
            img.src = fallbackSprite;
          }, { once: true });

          if (effects?.to && effects.to[0] === row && effects.to[1] === col) {
            img.classList.add('piece-arrive');
          }
          cell.appendChild(img);
        }

        this.boardEl.appendChild(cell);
      }
    }
  }
}
