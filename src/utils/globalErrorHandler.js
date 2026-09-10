
const sendErrorDev = (err,res)=>{
    res.status(err.statusCode).json({
        status:err.status,
        error:err,
        message: err.message,
        stack: err.stack
    })
}

const sendErrorProd = (err, res) => {
  // 1. Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } 
  // 2. Programming or other unknown error: don't leak details
  else {
    console.error('ERROR 💥', err); // Log internally
    
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!', // Generic message
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

module.exports = globalErrorHandler