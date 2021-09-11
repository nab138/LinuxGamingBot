module.exports.range = range
function range(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }