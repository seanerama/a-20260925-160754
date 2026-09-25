// Star Lab — walking skeleton entry point.
//
// Boots the <canvas id="stage"> defined in index.html and draws a
// placeholder scene (sky, ground, loading text) so the page is visibly
// alive before any real game systems land in later stages.
//
// Browser-only: this module touches `document` and is never imported by
// the test suite (node --test has no DOM).

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

drawPlaceholderScene(ctx, canvas.width, canvas.height);

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
function drawPlaceholderScene(ctx, width, height) {
  // Sky
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, width, height);

  // Ground strip along the bottom
  const groundHeight = 80;
  ctx.fillStyle = '#7cb95c';
  ctx.fillRect(0, height - groundHeight, width, groundHeight);

  // Loading text
  ctx.fillStyle = '#22314a';
  ctx.font = '28px "Comic Sans MS", "Trebuchet MS", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Star Lab — loading experiments…', width / 2, height / 2);
}
