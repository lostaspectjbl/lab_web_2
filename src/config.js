require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  flags: {
    lab01: process.env.FLAG_LAB01 || 'UbigCTF{lab01_default_flag_please_set_in_env}',
    lab02: process.env.FLAG_LAB02 || 'UbigCTF{lab02_default_flag_please_set_in_env}',
    lab03: process.env.FLAG_LAB03 || 'UbigCTF{lab03_default_flag_please_set_in_env}',
    lab04: process.env.FLAG_LAB04 || 'UbigCTF{lab04_default_flag_please_set_in_env}',
    lab05: process.env.FLAG_LAB05 || 'UbigCTF{lab05_default_flag_please_set_in_env}',
    lab06: process.env.FLAG_LAB06 || 'UbigCTF{lab06_default_flag_please_set_in_env}',
    lab07: process.env.FLAG_LAB07 || 'UbigCTF{lab07_default_flag_please_set_in_env}',
    lab08: process.env.FLAG_LAB08 || 'UbigCTF{lab08_default_flag_please_set_in_env}',
    lab09: process.env.FLAG_LAB09 || 'UbigCTF{lab09_default_flag_please_set_in_env}',
    lab10: process.env.FLAG_LAB10 || 'UbigCTF{lab10_default_flag_please_set_in_env}'
  }
};
