#include "log.h"
#include "lmdb/lmdb.h"
#include <chrono>
#include <ctime>
#include <iostream>
#include <thread>
#if defined(__APPLE__) || defined(__gnu_linux__) || defined(__linux__) 
#include <sys/types.h>
#include <sys/stat.h>
#elif defined(WIN32)
#include <direct.h>
#include <io.h>
#endif
#ifndef _WIN32
#include <errno.h>
#include <string.h> 
#endif
#include "util/util.h"

namespace caxios {
  std::string err2str(int err) {
    if (err > 0) {
      return strerror(err);
    }
    else {
      return mdb_strerror(err);
    }
  }

  std::string get_file_name(const char* pathname) {
    std::string fullpath(pathname);
#ifdef WIN32
    size_t pos = fullpath.find_last_of('\\');
#else
    size_t pos = fullpath.find_last_of('/');
#endif
    return fullpath.substr(pos + 1, fullpath.size() - pos - 1);
  }

  std::string current()
  {
    using namespace std::chrono;
    auto n = system_clock::now();
    system_clock::duration tp = n.time_since_epoch();
    tp -= duration_cast<seconds>(tp);
    time_t tt = system_clock::to_time_t(n);
    tm t = *gmtime(&tt);
    char buf[64] = { 0 };
    sprintf(buf, "%04u-%02u-%02u %02u:%02u:%02u.%03u", t.tm_year + 1900,
      t.tm_mon + 1, t.tm_mday, t.tm_hour, t.tm_min, t.tm_sec,
      static_cast<unsigned>(tp / std::chrono::milliseconds(1)));
    return std::string(buf);
  }

  unsigned int threadid() {
    auto tid = std::this_thread::get_id();
#ifdef _WIN32
    return *(_Thrd_id_t*)&tid;
#elif __APPLE__
    return pthread_mach_thread_np(*(pthread_t*)&tid);
#else
    return *(__gthread_t*)&tid;
#endif
  }

  class FLog {
  public:
    FLog(){
    }
    ~FLog(){
      fclose(_file);
    }

    bool Open(bool flag) {
      std::string logname("civetkern_");
      std::string mode("read");
      if (flag == 0) mode = "write";
      int idx = 1;
      std::string filename;
      while (true) {
        filename = logname + std::to_string(idx) + "_" + mode + ".log";
        if (!caxios::exist(filename)) {
          logname = filename;
          break;
        }
        else {
          struct stat statbuf;
          stat(filename.c_str(), &statbuf);
          if (statbuf.st_size < 1024 * 1024 * 1024) {
            break;
          }
        }
        idx += 1;
      }
      _file = fopen(filename.c_str(), "a+");
    }

    void Write(const std::string& log) {
      fputs(log.c_str(), _file);
      fflush(_file);
    }

  private:
    bool validateMaxSize() {
      return false;
    }
  private:
    FILE* _file = nullptr; 
  };
  static FLog s_log;
  void log2file(const std::string& log)
  {
    s_log.Write(log);
  }

  bool init_log(bool flag) {
    return s_log.Open(flag);
  }
}