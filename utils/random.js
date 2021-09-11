module.exports.range = this.range
function range(min, max) {  
    return Math.floor(
      Math.random() * (max - min) + min
    )
  }