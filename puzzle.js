// Globals
// Should properly be moved to an object so multiple puzzles can be instantiated.

// Configuration: we can change the size of the puzzle if we want.
const n_x = 4; // These are hard-coded for a 15-tile puzzle, but you can adjust these 
const n_y = 4; // Also need to change CSS tile sizes. if you do that.

// 
// The tiles are represented by simple objects:
// { val:  The number printed on this tile
//   ix: <0-3>  The current horizontal grid position of this tile
//   ix: <0-3>  The current vertical grid position of this tile
//   elem: div> A JQuery handle to this tile's DOM element.
// }
// We keep these in an array that's sorted only by the puzzle intial configuraton.

var tiles = []; 
const n_tiles = n_x*n_y -1;

var tile_width, tile_height; 

var space = {ix:n_x-1, iy:n_y-1}; // Empty spot starts in lower right-hand corner.

$(function(){
  // create the tiles
  // Each tile object
  for(var i = 1;i<n_tiles+1;i++) { // note we are indexing by 1, not zero
    var elem = $("<div class='tile'></div>");
    var tile = {elem, val:i};
    elem.text(i);
    elem.data("tile",tile);
    tiles.push(tile)
    $('#puzzle').append(tile.elem);
  }

  tile_width = $("#puzzle").width()/n_x;
  tile_height= $("#puzzle").height()/n_y;

  $('#puzzle').on('click','div.tile',tile_clicked);
  $("#win").on("click",function(){
    $("#win").hide()
    reset_puzzle(true);
  });

  $("#reset").on("click",reset_puzzle);

  reset_puzzle(false); // For the purposes of testing, it's useful to have the puzzle start out solved.
  
});

function reset_puzzle(shuffle)
{
  if(shuffle) shuffleArray(tiles);
  for(var i=0;i<n_tiles;i++) {
    var tile = tiles[i];
    tile.ix = i%n_x;
    tile.iy = Math.floor(i/n_x);
    move_tile(tile);
  } 
  space = {ix:n_x-1, iy:n_y-1}; // Space goes in lower right hand position.
}


// Shuffling
//
// There isn't builtin shuffle methond in javascript, like there is in python,
// One solution is this one:
//
// Randomize array in-place using Durstenfeld shuffle algorithm 
// Taken from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
function shuffleArray(array) {
  // This function CAN lead to unsolvable configurations.

  // track pairity
  var pairity = 1;
  for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
      if(i!=j) pairity*=-1; // No swap is even pairity; all else are odd
  }

  // We want an even number of swaps, to give us an even pairty, which means a solvable. puzzle.
  // If we don't have it, just swap the first two elements. (Or move the empty space!)
  if(pairity==-1) {
    // This was an odd number of swaps
    tmp = array[0];
    array[0] = array[1];
    array[1] = tmp;
  }
}


function shake_tile(tile)
{
  // Abuse CSS a bit to cause the shake animation in the case of an illegal move.
  tile.elem.removeClass("shake");
  void tile.elem[0].offsetWidth; // trigger reflow
  tile.elem.addClass("shake");
}

function tile_clicked(event) {
  // A tile was clicked! This is the core:  

  var elem = $(event.target);
  if(!elem.data("tile")) console.log("Tile clicked with no .data-tile attribute?"); // Sanity check - shouldn't happen.
  var hit_tile = elem.data("tile");

  // Valid move?
  if((hit_tile.ix != space.ix) && (hit_tile.iy != space.iy)) 
  {
    shake_tile(hit_tile); 
    //console.log("invalid move"); 
    return; 
  }

  // Ok, this is a valid move. Figure out which tiles are going to move:
  var moved_tiles = [];
  var dix=0,diy=0;  // delta x,y movement of affected tiles.

  if(hit_tile.ix == space.ix) {
    // Column shift
    if(hit_tile.iy > space.iy) {
      
      // Column shift up
      diy = -1;
      for(var iy=space.iy+1;iy<=hit_tile.iy;iy++) 
        moved_tiles.push(find_tile(space.ix,iy));
      
    } else {

      // Column shift down
      diy = +1;
      for(var iy=space.iy-1;iy>=hit_tile.iy;iy--) 
        moved_tiles.push(find_tile(space.ix,iy));
      
    }
  } else {    
    
    // Row shift
    if(hit_tile.ix > space.ix) {
      // row shift left
      dix = -1;
      for(var ix=space.ix+1;ix<=hit_tile.ix;ix++) 
        moved_tiles.push(find_tile(ix,space.iy));
      
    } else {
    
      // row shift right
      dix = +1;
      for(var ix=space.ix-1;ix>=hit_tile.ix;ix--) 
        moved_tiles.push(find_tile(ix,space.iy));
      
    }    
  }
  // console.log("moving",moved_tiles,dix,diy)

  // Set their new ix,iy grid positions, use those to set CSS offsets. Animation will start going after this function finishes.
  for(var tile of moved_tiles) {
    tile.ix += dix;
    tile.iy += diy;
    move_tile(tile);
  }

  space.ix -= dix*moved_tiles.length; // If tiles move right, the space displaces left by the number of tiles.
  space.iy -= diy*moved_tiles.length; // ditto up/down

  if( check_for_win() ) $('#win').show(); // yay!
}

// Given a grid position, find the tile object
function find_tile(ix,iy)
{
  // This is inefficient, but it's only 15 tiles. Dont' let the perfect be the enemy of the good.
  // To do this more properly, we could keep an ordered list after every move, or an array-of-arrays to track the grid.
  // OR we could store ix,iy in the tile DOM element, then search the DOM
  for(var tile of tiles) 
    if(tile.ix == ix && tile.iy==iy) return tile;
  console.log("could not file tile",ix,iy);
}


// Puts the tile screen position so it matches the ix,iy grid coordinate in the tile object.
// Give me the correct screen x,y positions for a tile at this grid location.
function move_tile(tile)
{
  var x = tile.ix * tile_width+2.5;
  var y = tile.iy * tile_height+2.5;
  tile.elem.css("left",x);
  tile.elem.css("top",y);
}

// Winning:
function check_for_win()
{
  // The empty space must be in the lower-right corner if we're complete, so this is an efficient check.
  if(space.ix != n_x-1  || space.iy != n_y-1 ) { console.log("space not in bottom right"); return false;}
  // For each grid position, check that the tile is in the right place.
  for(var ix=0; ix<n_x; ix++) {
    for(var iy=0;iy<n_y; iy++) {
      if(ix==n_x-1 && iy==n_y-1) continue; // don't check the space.
      var tile = find_tile(ix,iy);
      var should_be = iy*n_x + ix +1; // Ordinal value of x,y. Remember value is 1-based not zero-based
      if(tile.val != iy*n_x + ix +1) { console.log(ix,iy," is ",tile.val," should be ",iy*n_x + ix+1); return false;}
    }
  }
  return true;
}

//each tile knows it's ix,iy coord.
// Create tiles in positions
// When clicking a tile, compute new positions for all tiles
// Set positions and animate.
// Then check ix,iy against coords to see if you get victory.