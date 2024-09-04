  class Errorhandler extends Error {
    constructor(message, statuscode) {
        super(message);
        this.statuscode = statuscode;
       
    }
}

export {Errorhandler}


