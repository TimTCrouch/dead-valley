require(['tilemarshal', 'assetmanager', 'progress', 'editor-sprites'],
	function (tileMarshal, AssetManager, progress, SPRITES) {

  var Tile = function () {};

  var TILE_SIZE = 60;
  var MAP_SIZE  = 64;
  var TILE_SHEET_WIDTH;

  var $tileList   = $('#tile-list');

  var $spriteList = $('#sprite-list');

  var $map        = $('#map');
  var $mapMask    = $('#map-mask');
  var mapMaskPos  = $mapMask.position();

  // the current selected tile from the list
  var selectedTile = 0;

  // the current selected sprite from the list
  var selectedSprite = -1;

  // the current state of the controls
  var flipTiles    = false;
  var rotateTiles  = 0;

  // the current tile targeted by the mouse
  var currentTarget = null;

  var TileDisplay = {
    findTile: function (event) {
      var target = $(event.target);
      if (target.is('.tile')) {
        return target;
      }
    },

    getTileObject: function (tile) {
      if (tile.target) { // 'tile' is an event object
        tile = TileDisplay.findTile(tile);
      }
      return tile.data('tile');
    },

    update: function (tile, attr, value) {
      TileDisplay[attr](tile, value);
    },

    tileOffset: function (tile, offset) {
      var left = (offset % TILE_SHEET_WIDTH) * TILE_SIZE;
      var top  = Math.floor(offset / TILE_SHEET_WIDTH) * TILE_SIZE;
      tile.css({'background-position': -left + 'px ' + -top + 'px'}).show();
    },

    tileFlip: function (tile, flip) {
      if (flip) {
        tile.addClass('flip-horizontal');
      } else {
        tile.removeClass('flip-horizontal');
      }
    },

    tileRotate: function (tile, rotate) {
      rotate = rotate * 90; // values are 0-3
      tile.removeClass('rotate-90 rotate-180 rotate-270');
      if (rotate) {
        tile.addClass('rotate-'+rotate);
      }
    },

    collidable: function (tile, collidable) {
      if (collidable) {
        tile.addClass('collidable');
      } else {
        tile.removeClass('collidable');
      }
    }
  };

  var selectTileType = function (tile) {
    if (typeof(tile) === 'number') {
      tile = $tileList.children().eq(tile);
    }
    if (tile && tile.is('.list-tile')) {
      tile.siblings().removeClass('selected');
      tile.addClass('selected');
      selectedTile = tile.prevAll().length;
      selectSpriteType(); // clear selected sprite
    } else {
      $tileList.children().removeClass('selected');
      selectedTile = -1;
    }
  };
  
  var selectSpriteType = function (sprite) {
    if (typeof(sprite) === 'number') {
      sprite = $spriteList.children().eq(sprite);
    }
    if (sprite) {
      sprite.siblings().removeClass('selected');
      sprite.addClass('selected');
      selectedSprite = sprite.prevAll().length;
      selectTileType(); // clear selected tile
    } else {
      $spriteList.children().removeClass('selected');
      selectedSprite = -1;
    }
  };

  var loadMap = function (text) {
    $.getScript("maps/" + text, function () {
      if (window.map) {
        progress.setTotal(window.map.length);

        var line = 0;
	var nodes = $map.children();
	for (var i = 0; i < MAP_SIZE; i++) {
          (function (line) {
            var index, node, tileObject, j;
            window.setTimeout(function () {
              for (j = 0; j < MAP_SIZE; j++) {
                index = line * MAP_SIZE + j;
                node = nodes.eq(index);
                tileObject = TileDisplay.getTileObject(node);
                tileObject.setFromString(window.map[index]);
              }
              progress.increment(MAP_SIZE);
            }, 0);
          })(i);
	}
      }

      if (window.sprites) {
	_(window.sprites).each(function (spriteString) {
	  var vals = spriteString.split(',');
	  var name = vals[0];
	  var x    = parseInt(vals[1]);
	  var y    = parseInt(vals[2]);
	  var rot  = parseInt(vals[3]);
	  var sprite = generateSpriteTile('div', name).css({
	    left: x,
	    top: y
	  });
	  $map.append(sprite);
	});
      }
    });
  };

  var saveMapText = function () {
    var tiles = [];
    var nodes = $map.children(':not(.sprite)');
    for (var i = 0; i < nodes.length; i++) {
      var tileObject = TileDisplay.getTileObject(nodes.eq(i));
      tiles.push(tileObject.toString());
    }
    // TODO do something with these magic numbers
    var roads = {
      n: TileDisplay.getTileObject(nodes.eq(32)).tileOffset === 5,
      s: TileDisplay.getTileObject(nodes.eq(4064)).tileOffset === 5,
      e: TileDisplay.getTileObject(nodes.eq(2111)).tileOffset === 5,
      w: TileDisplay.getTileObject(nodes.eq(2048)).tileOffset === 5
    };
    return [
      "map=\"" + tiles.join('') + "\"",
      "roads=" + JSON.stringify(roads)
    ].join(';') + ';';
  };

  var setupComponentSizes = function () {
    $tileList.height(window.innerHeight - 60);
    $mapMask.height($tileList.height());
    $mapMask.width(window.innerWidth - $tileList.width() - 60);
  };

  var setupTileList = function () {
    var assetManager = new AssetManager('./assets/');
    assetManager.registerImage('tiles.png');

    assetManager.registerCompleteLoadCallback(function () {
      // set up the tile selection
      var tiles = assetManager.images.tiles;
      TILE_SHEET_WIDTH = tiles.width / TILE_SIZE;
      var total = TILE_SHEET_WIDTH * (tiles.height / TILE_SIZE);
      for (var i = 0; i < total; i++) {
	var tile = $('<div>', {'class':'list-tile'});
	TileDisplay.tileOffset(tile, i);
	$tileList.append(tile);
	if (i == 0) {
	  tile.addClass('selected');
	}
      }

      setupComponentSizes();
    });

    assetManager.loadAssets();
  };

  var generateSpriteTile = function (type, name) {
    var val = SPRITES[name];
    return $('<'+type+'/>').css({
      'background-image': 'url(assets/' + val.img + '.png)',
      'background-position': val.offset + ' 0',
      width: val.width,
      height: val.height
    }).addClass('sprite');
  };

  var setupSpriteList = function () {
    _(SPRITES).each(function (val, name) {
      var sprite = generateSpriteTile('li', name).attr('id', name+'-sprite');
      $spriteList.append(sprite);
    });
  };

  var setupMapTiles = function () {
    for (var top = 0; top < MAP_SIZE; top++) {
      var tile, tileObj;
      for (var left = 0; left < MAP_SIZE; left++) {
        tile = $('<div>', {'class':'tile'});
        tile.css({left:left*TILE_SIZE, top:top*TILE_SIZE});
        tileObj = new Tile();
        tileObj.tileDisplay = tile;
        tile.data('tile', tileObj);
        $map.append(tile);
      };
    }

    var tiles = $map.children();

    // mark which tiles are the road matchers
    _([  31,   32,   33,
       1984, 2048, 2112,
       2047, 2111, 2175,
       4063, 4064, 4065]).each(function (offset) {
      tiles.eq(offset).addClass('road-matcher');
    });
  };

  var updateTile = function (event) {
    var tileObject = TileDisplay.getTileObject(event);
    tileObject.tileOffset = selectedTile;
    tileObject.tileFlip   = flipTiles;
    tileObject.tileRotate = rotateTiles;
  };

  var selectSprite = function (event) {
    var target = $(event.target);
    if (target.is('.sprite')) {
      target.siblings('.sprite').removeClass('selected');
      target.addClass('selected');
    }
  };

  var addSprite = function (event) {
    $map.children('.sprite').removeClass('selected');
    var sprite = $spriteList.children().eq(selectedSprite).clone();
    sprite.css({
      left: event.pageX + $mapMask[0].scrollLeft - mapMaskPos.left - sprite.width(),
      top: event.pageY + $mapMask[0].scrollTop - mapMaskPos.top - sprite.height()/2
    });
    $map.append(sprite);
  };

  var toggleTileFlip = function (tile) {
    var tileObject = TileDisplay.getTileObject(tile);
    tileObject.tileFlip = !tileObject.tileFlip;
  };

  var toggleTileCollide = function (tile) {
    var tileObject = TileDisplay.getTileObject(tile);
    tileObject.collidable = !tileObject.collidable;
  };

  var cycleTileRotate = function (tile) {
    var tileObject = TileDisplay.getTileObject(tile);
    tileObject.tileRotate = (tileObject.tileRotate + 1) % 4;
  };

  var setupMouseHandling = function () {
    // tile selection
    $tileList.click(function (e) {
      var target = $(e.target);
      selectTileType(target);
    });

    $spriteList.click(function (e) {
      var target = $(e.target);
      selectSpriteType(target);
    });

    // map clicks/drags
    $map.click(function (e) {
      if ($(e.target).is('.sprite')) {
	selectSprite(e);
      } else if (selectedTile > -1) {
	updateTile(e);
      } else {
       	addSprite(e);
      }
    }).mousemove(function (e) {
      currentTarget = e.target;
      if (e.shiftKey) {
	updateTile(e);
      }
    }).mouseleave(function (e) {
      currentTarget = null;
    });
  };

  var setupControls = function () {
    // show grid checkbox
    $('#show-grid-checkbox').change(function (e) {
      if ($(this).is(':checked')) {
	$map.addClass('show-grid');
      } else {
	$map.removeClass('show-grid');
      }
    });

    // flip checkbox
    $('#flip-checkbox').change(function (e) {
      flipTiles = $(this).is(':checked');
    });

    // rotate select box
    $('#rotate-control').change(function (e) {
      rotateTiles = parseInt($(this).val());
    });

    $('#load-button').click(function () {
      $('#load').lightbox_me();
    });

    $('#load-file').change(function (e) {
      $('.lb_overlay').click(); // cheesy way to close the overlay
      loadMap(e.target.files[0].fileName);
    });

    $('#save-button').click(function () {
      var saveText = $('#save-text');
      saveText.val(saveMapText());

      $('#save').lightbox_me({
        onLoad: function () {
          saveText.focus().select();
        }
      });
    });
  };

  var setupHotKeys = function () {
    $(window).keydown(function (e) {
      var target = $(currentTarget);
      target = target.is('.tile') && target;

      switch (e.keyCode) {
	case 67: // c is for COLLIDE
	  if (target) {
            toggleTileCollide(target);
	  }
	  break;
	case 68: // d is for DROPPER
	  if (target) {
	    selectTileType(target.data('offset') || 0);
	  }
	  break;
	case 70: // f is for FLIP
	  if (e.altKey) {
	    $('#flip-checkbox').click();
	  } else if (target) {
	    toggleTileFlip(target);
	  }
	  break;
	case 82: // r is for ROTATE
	  if (e.altKey) {
	  } else if (target) {
	    cycleTileRotate(target);
	  }
	  break;
	case 8: // delete is for DELETE
	  $map.children('.sprite.selected').remove();
	  break;
	default:
	  // nothing
      }
    });
  };

  var setupTileObject = function () {
    Tile.prototype.tileOffset = 0;
    _(['tileOffset', 'tileFlip', 'tileRotate', 'collidable']).each(function (attr) {
      Tile.prototype.__defineSetter__(attr, function (val) {
        if (!this.values) {
          this.values = {};
        }
        this.values[attr] = val;
        if (this.callback) {
          this.callback(this.tileDisplay, attr, val);
        }
      });
      Tile.prototype.__defineGetter__(attr, function (val) {
        return (this.values && this.values[attr]) || 0;
      });
    });
    // so the view can get the data updates
    Tile.prototype.callback = TileDisplay.update;
    tileMarshal(Tile);
  };

  require.ready(function () {
    setupTileObject();
    setupTileList();
    setupSpriteList();
    setupMapTiles();
    setupMouseHandling();
    setupControls();
    setupHotKeys();
  });

});