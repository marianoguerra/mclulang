(module
	(memory (export "mem") 10)

	(type $Val (struct (field $tag i8) (field $v eqref)))

	(func $valGetTag (export "valGetTag") (param $v (ref $Val)) (result i32)
		(struct.get_u $Val $tag (local.get $v)))

	;; nil

	(type $Nil (struct))
	(global $TYPE_NIL (export "TYPE_NIL") i32 (i32.const 0))

	(global $NIL (export "NIL") (ref $Val)
		(struct.new $Val (global.get $TYPE_NIL) (struct.new $Nil)))

	(func $isNil (export "isNil") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_NIL)))

	;; int

	(type $Int (struct (field $val i64)))
	(global $TYPE_INT (export "TYPE_INT") i32 (i32.const 1))

	(global $TRUE (export "TRUE") (ref $Val)
		(struct.new $Val (global.get $TYPE_INT) (struct.new $Int (i64.const 1))))

	(func $newInt (export "newInt") (param $i i64) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_INT)
			(struct.new $Int (local.get $i))))

	(func $isInt (export "isInt") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_INT)))

	(func $valGetInt (export "valGetInt") (param $v (ref $Val)) (result (ref $Int))
		(struct.get $Val $v (local.get $v))
		(ref.cast (ref $Int)))

	(func $valGetI64 (export "valGetI64") (param $v (ref $Val)) (result i64)
	    (struct.get $Int $val
			(call $valGetInt (local.get $v))))

	;; float

	(type $Float (struct (field $val f64)))
	(global $TYPE_FLOAT (export "TYPE_FLOAT") i32 (i32.const 2))

	(func $newFloat (export "newFloat") (param $i f64) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_FLOAT)
			(struct.new $Float (local.get $i))))

	(func $isFloat (export "isFloat") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_FLOAT)))

	(func $valGetFloat (export "valGetFloat")
			(param $v (ref $Val)) (result (ref $Float))
		(struct.get $Val $v (local.get $v))
		(ref.cast (ref $Float)))

	(func $valGetF64 (export "valGetF64") (param $v (ref $Val)) (result f64)
	    (struct.get $Float $val
			(call $valGetFloat (local.get $v))))

	;; str

	(type $Str (array (mut i8)))
	(global $TYPE_STR (export "TYPE_STR") i32 (i32.const 3))

	(func $isStr (export "isStr") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_STR)))

	(func $strFromRawStr (param $rs (ref $Str)) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_STR)
			(local.get $rs)))

	(func $strFromMem (export "strFromMem")
			(param $start i32) (param $len i32) (result (ref $Val))
		(call $strFromRawStr
			(call $rawStrFromMem (local.get $start) (local.get $len))))

	(func $rawStrFromMem (export "rawStrFromMem")
			(param $start i32) (param $len i32) (result (ref $Str))

		;; let $i: i32, $end: i32, str: Str
	    (local $i i32)
	    (local $end i32)
		(local $arr_i i32)
		(local $str (ref $Str))

	    ;; $end = $start + $len
	    (local.set $end (i32.add (local.get $start) (local.get $len)))

	    ;; $i = $start
	    (local.set $i (local.get $start))

		;; $str = new Str($len)
		(local.set $str (array.new_default $Str (local.get $len)))

	    ;; while ($i < $end)
	    block $loop_exit
	      loop $loop
	        ;; Break the loop if $i >= $end
	        (i32.ge_s (local.get $i) (local.get $end))
	        br_if $loop_exit

			(array.set $Str
				(local.get $str) (local.get $arr_i) (i32.load8_u (local.get $i)))

	        ;; $i++
	        (local.set $i (i32.add (local.get $i) (i32.const 1)))

			;; $arr_i++
			(local.set $arr_i (i32.add (local.get $arr_i) (i32.const 1)))

	        ;; Continue the loop
	        br $loop
	      end
	    end

		(local.get $str)
	)

	(func $valGetStr (export "valGetStr")
			(param $v (ref $Val)) (result (ref $Str))
		(ref.cast (ref $Str)
			(struct.get $Val $v (local.get $v))))

	(func $strLen (export "strLen") (param $v (ref $Val)) (result i32)
		(array.len
			(call $valGetStr (local.get $v))))

	(func $strGetChar (export "strGetChar")
			(param $v (ref $Val)) (param $i i32) (result i32)
		(array.get_u $Str
			(call $valGetStr (local.get $v))
			(local.get $i)))

	(func $strEquals (export "strEquals")
			(param $a (ref $Val))
			(param $b (ref $Val))
			(result i32)
		(call $rawStrEquals
			(call $valGetStr (local.get $a))
			(call $valGetStr (local.get $b))))

	(func $rawStrEquals (export "rawStrEquals")
			(param $aStr (ref $Str))
			(param $bStr (ref $Str))
			(result i32)

		(local $i i32)
		(local $isEqual i32)
		(local $aLen i32)
		(local $bLen i32)

		(local.set $aLen (array.len (local.get $aStr)))
		(local.set $bLen (array.len (local.get $bStr)))

		(if (result i32) (i32.eq (local.get $aLen) (local.get $bLen))
		(then
		    ;; while ($i < $end)
		    block $loop_exit
		      loop $loop
		        ;; Break the loop if $i >= $aLen
		        (i32.ge_s (local.get $i) (local.get $aLen))
				(local.set $isEqual (i32.const 1))
		        br_if $loop_exit
				(local.set $isEqual (i32.const 0))

				(i32.ne
					(array.get_u $Str (local.get $aStr) (local.get $i))
					(array.get_u $Str (local.get $bStr) (local.get $i)))
				;; if aStr[i] != bStr[i]: break
				(br_if $loop_exit)

		        ;; $i++
		        (local.set $i (i32.add (local.get $i) (i32.const 1)))

		        ;; Continue the loop
		        br $loop
		      end
		    end

			(local.get $isEqual)
		)
		(else
			(i32.const 0)
		))
	)

	;; pair

	(type $Pair (struct (field $a (ref $Val)) (field $b (ref $Val))))
	(global $TYPE_PAIR (export "TYPE_PAIR") i32 (i32.const 4))
	
	(func $isPair (export "isPair") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_PAIR)))

	(func $newPair (export "newPair")
			(param $a (ref $Val)) (param $b (ref $Val))
			(result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_PAIR)
			(struct.new $Pair (local.get $a) (local.get $b))))

	(func $valGetPair (export "valGetPair")
			(param $v (ref $Val)) (result (ref $Pair))
		(ref.cast (ref $Pair)
			(struct.get $Val $v (local.get $v))))

	(func $pairGetA (export "pairGetA") (param $v (ref $Val)) (result (ref $Val))
		(struct.get $Pair $a
			(call $valGetPair (local.get $v))))

	(func $pairGetB (export "pairGetB") (param $v (ref $Val)) (result (ref $Val))
		(struct.get $Pair $b
		(call $valGetPair (local.get $v))))

	;; name

	(type $Name (struct (field $name (ref $Str))))
	(global $TYPE_NAME (export "TYPE_NAME") i32 (i32.const 5))

	(func $isName (export "isName") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_NAME)))

	(func $valGetNameRawStr (export "valGetNameRawStr")
			(param $v (ref $Val))
			(result (ref $Str))
		(struct.get $Name $name
			(ref.cast (ref $Name)
				(struct.get $Val $v (local.get $v)))))

	(func $valGetNameStr (export "valGetNameStr")
			(param $v (ref $Val))
			(result (ref $Val))
		(call $strFromRawStr
			(call $valGetNameRawStr (local.get $v))))

	(func $newName (export "newName") (param $s (ref $Str)) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_NAME)
			(struct.new $Name (local.get $s))))

	;; later

	(type $Later (struct (field $val (ref $Val))))
	(global $TYPE_LATER (export "TYPE_LATER") i32 (i32.const 6))

	(func $isLater (export "isLater") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_LATER)))

	(func $newLater (export "newLater") (param $v (ref $Val)) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_LATER)
			(struct.new $Later (local.get $v))))

	(func $laterUnwrap (export "laterUnwrap")
			(param $v (ref $Val)) (result (ref $Val))
		(struct.get $Later $val
			(ref.cast (ref $Later)
				(struct.get $Val $v (local.get $v)))))

	;; msg

	(type $Msg (struct (field $verb (ref $Str)) (field $obj (ref $Val))))
	(global $TYPE_MSG (export "TYPE_MSG") i32 (i32.const 7))

	(func $isMsg (export "isMsg") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_MSG)))

	(func $newRawMsg (export "newRawMsg")
			(param $verb (ref $Str)) (param $obj (ref $Val))
			(result (ref $Msg))
		(struct.new $Msg
			(local.get $verb)
			(local.get $obj)))

	(func $newMsg (export "newMsg")
			(param $verb (ref $Str)) (param $obj (ref $Val))
			(result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_MSG)
			(struct.new $Msg
				(local.get $verb)
				(local.get $obj))))

	(func $valGetMsgVerbRawStr (param $v (ref $Val)) (result (ref $Str))
		(struct.get $Msg $verb
			(ref.cast (ref $Msg)
				(struct.get $Val $v (local.get $v)))))

	(func $valGetMsgVerb (export "valGetMsgVerb")
			(param $v (ref $Val))
			(result (ref $Val))
		(call $strFromRawStr
			(call $valGetMsgVerbRawStr (local.get $v))))

	(func $valGetMsgObj (export "valGetMsgObj")
			(param $v (ref $Val))
			(result (ref $Val))
		(struct.get $Msg $obj
			(ref.cast (ref $Msg)
				(struct.get $Val $v (local.get $v)))))

	;; send

	(type $Send (struct (field $subj (ref $Val)) (field $msg (ref $Msg))))
	(global $TYPE_SEND (export "TYPE_SEND") i32 (i32.const 8))

	(func $isSend (export "isSend") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_SEND)))

	(func $newSend (export "newSend")
			(param $subj (ref $Val)) (param $msg (ref $Msg))
			(result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_SEND)
			(struct.new $Send
				(local.get $subj)
				(local.get $msg))))

	(func $valGetSendSubj (export "valGetSendSubj")
			(param $v (ref $Val))
			(result (ref $Val))
		(struct.get $Send $subj
			(ref.cast (ref $Send)
				(struct.get $Val $v (local.get $v)))))

	(func $valGetSendMsg (export "valGetSendMsg")
			(param $v (ref $Val))
			(result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_MSG)
			(struct.get $Send $msg
				(ref.cast (ref $Send)
					(struct.get $Val $v (local.get $v))))))

	;; block

	(type $Block (array (mut (ref $Val))))
	(global $TYPE_BLOCK (export "TYPE_BLOCK") i32 (i32.const 9))

	(func $isBlock (export "isBlock") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_BLOCK)))

	(func $newBlock (export "newBlock") (param $size i32) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_BLOCK)
			(array.new $Block (global.get $NIL) (local.get $size))))

	(func $valGetBlockRaw (param $v (ref $Val)) (result (ref $Block))
		(ref.cast (ref $Block)
			(struct.get $Val $v (local.get $v))))

	(func $blockLen (export "blockLen") (param $v (ref $Val)) (result i32)
		(array.len
			(call $valGetBlockRaw (local.get $v))))
	
	(func $blockGetItem (export "blockGetItem")
			(param $v (ref $Val))
			(param $i i32)
			(result (ref $Val))
		(array.get $Block (call $valGetBlockRaw (local.get $v)) (local.get $i)))

	(func $blockSetItem (export "blockSetItem")
			(param $v (ref $Val))
			(param $i i32)
			(param $item (ref $Val))
		(array.set $Block
			(call $valGetBlockRaw (local.get $v))
			(local.get $i)
			(local.get $item)))

	;; array

	(type $Array (array (mut (ref $Val))))
	(global $TYPE_ARRAY (export "TYPE_ARRAY") i32 (i32.const 10))

	(func $isArray (export "isArray") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_ARRAY)))

	(func $newArray (export "newArray") (param $size i32) (result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_ARRAY)
			(array.new $Array (global.get $NIL) (local.get $size))))

	(func $valGetArrayRaw (param $v (ref $Val)) (result (ref $Array))
		(ref.cast (ref $Array)
			(struct.get $Val $v (local.get $v))))

	(func $arrayLen (export "arrayLen") (param $v (ref $Val)) (result i32)
		(array.len
			(call $valGetArrayRaw (local.get $v))))
	
	(func $arrayGetItem (export "arrayGetItem")
			(param $v (ref $Val))
			(param $i i32)
			(result (ref $Val))
		(array.get $Array (call $valGetArrayRaw (local.get $v)) (local.get $i)))

	(func $arraySetItem
			(export "arraySetItem")
			(param $v (ref $Val))
			(param $i i32)
			(param $item (ref $Val))
		(array.set $Array
			(call $valGetArrayRaw (local.get $v))
			(local.get $i)
			(local.get $item)))

	;; bind entry

	(type $BindEntry
		(struct
			(field $key (ref $Str))
			(field $val (ref $Val))
			(field $up (ref null $BindEntry))))

	(func $newBindNull (export "newBindNull") (result (ref null $BindEntry))
		(ref.null $BindEntry))

	(func $newBindEntry (export "newBindEntry")
			(param $key (ref $Str))
			(param $val (ref $Val))
			(param $up (ref null $BindEntry))
			(result (ref $BindEntry))
		(struct.new $BindEntry
			(local.get $key)
			(local.get $val)
			(local.get $up)))

	(func $bindFind (export "bindFind")
			(param $be (ref null $BindEntry))
			(param $key (ref $Str))
			(result (ref null $Val))

		(if (result (ref null $Val)) (ref.is_null (local.get $be))
		(then (ref.null $Val))
		(else (if (result (ref null $Val))
				(call $rawStrEquals
					(local.get $key)
					(struct.get $BindEntry $key (local.get $be)))

			(then (struct.get $BindEntry $val (local.get $be)))
			(else (call $bindFind
						(struct.get $BindEntry $up (local.get $be))
						(local.get $key))))))
	)

	;; handler

	(type $HandlerFn
		(func
			(param $subj eqref)
			(param $verb eqref)
			(param $obj eqref)
			(param $e eqref)
			(result eqref)))

	(type $HandlerEntry
		(struct
			(field $key (ref $Str))
			(field $val (ref $HandlerFn))
			(field $up (ref null $HandlerEntry))))

	(func $newHandlerEntryNull (export "newHandlerEntryNull")
			(result (ref null $HandlerEntry))
		(ref.null $HandlerEntry))

	(func $newHandlerEntry (export "newHandlerEntry")
			(param $key (ref $Str))
			(param $val (ref $HandlerFn))
			(param $up (ref null $HandlerEntry))
			(result (ref $HandlerEntry))
		(struct.new $HandlerEntry
			(local.get $key)
			(local.get $val)
			(local.get $up)))

	(func $handlerFind (export "handlerFind")
			(param $he (ref null $HandlerEntry))
			(param $key (ref $Str))
			(result (ref null $HandlerFn))

		(if (result (ref null $HandlerFn))
				(ref.is_null (local.get $he))
		(then (ref.null $HandlerFn))
		(else (if (result (ref null $HandlerFn))
				(call $rawStrEquals
					(local.get $key)
					(struct.get $HandlerEntry $key (local.get $he)))
			(then (struct.get $HandlerEntry $val (local.get $he)))
			(else
				(call $handlerFind
					(struct.get $HandlerEntry $up (local.get $he))
					(local.get $key)))))))

	(func $callHandler (export "callHandler")
			(param $fn (ref null $HandlerFn))
			(param $subj eqref)
			(param $verb eqref)
			(param $obj eqref)
			(param $e eqref)
			(result (ref $Val))

		(ref.cast (ref $Val) (local.get $subj))
		(ref.cast (ref $Str) (local.get $verb))
		(ref.cast (ref $Val) (local.get $obj))
		(ref.cast (ref $Frame) (local.get $e))
		(local.get $fn)
		(call_ref $HandlerFn)
		(ref.cast (ref $Val)))

	;; handlers

	(type $NativeHandlers (array (mut (ref null $HandlerEntry))))
	(type $Handlers
		(struct
			(field $entries (ref $NativeHandlers))))

	(func $newNativeHandlers (result (ref $NativeHandlers))
		(array.new $NativeHandlers (call $newHandlerEntryNull) (i32.const 12)))

	(func $newHandlers (export "newHandlers") (result (ref $Handlers))
		(struct.new $Handlers
			(call $newNativeHandlers)))

	(func $handlersGetForType (export "handlersGetForType")
			(param $self (ref $Handlers))
			(param $t i32)
			(result (ref null $HandlerEntry))
		(array.get $NativeHandlers
			(struct.get $Handlers $entries (local.get $self))
			(local.get $t)))

	(func $handlersBind (export "handlersBind")
			(param $self (ref $Handlers))
			(param $t i32)
			(param $k (ref $Str))
			(param $h (ref $HandlerFn))
		(array.set $NativeHandlers
			(struct.get $Handlers $entries (local.get $self))
			(local.get $t)
			(call $newHandlerEntry
				(local.get $k)
				(local.get $h)
				(call $handlersGetForType
					(local.get $self)
					(local.get $t)))))

	(func $handlersFind (export "handlersFind")
			(param $self (ref $Handlers))
			(param $t i32)
			(param $k (ref $Str))
			(result (ref null $HandlerFn))
		(call $handlerFind
			(call $handlersGetForType
				(local.get $self)
				(local.get $t))
			(local.get $k)))

	;; frame

	(type $Frame
		(struct
			(field $left (ref null $Frame))
			(field $up (ref null $Frame))
			(field $leftLimit (mut i32))
			(field $upLimit (mut i32))
			(field $binds (mut (ref null $BindEntry)))
			(field $handlers (mut (ref $Handlers)))))

	(global $TYPE_FRAME (export "TYPE_FRAME") i32 (i32.const 11))

	(func $newFrameVal (export "newFrameVal")
			(param $v (ref $Frame))
			(result (ref $Val))
		(struct.new $Val
			(global.get $TYPE_FRAME)
			(local.get $v)))

	(func $isFrame (export "isFrame") (param $v (ref $Val)) (result i32)
		(i32.eq (call $valGetTag (local.get $v)) (global.get $TYPE_FRAME)))

	(func $newFrameNull (export "newFrameNull")
			(result (ref null $Frame))
		(ref.null $Frame))

	(func $newFrame (export "newFrame")
			(result (ref $Frame))
		(struct.new $Frame
			(call $newFrameNull)
			(call $newFrameNull)
			(i32.const 0)
			(i32.const 0)
			(call $newBindNull)
			(call $newHandlers)))

	(func $frameDown (export "frameDown")
			(param $f (ref $Frame))
			(result (ref $Frame))
		(struct.new $Frame
			(struct.get $Frame $left (local.get $f))
			(local.get $f)
			(i32.const 0)
			(i32.const 0)
			(call $newBindNull)
			(struct.get $Frame $handlers (local.get $f))))

	(func $frameUp (export "frameUp")
			(param $f (ref null $Frame)) ;; doesn't check if ref.null
			(result (ref null $Frame))
		(struct.get $Frame $up (local.get $f)))

	(func $frameBind (export "frameBind")
			(param $f (ref $Frame))
			(param $key (ref $Str))
			(param $val (ref $Val))
		(struct.set $Frame $binds
			(local.get $f)
			(call $newBindEntry
				(local.get $key)
				(local.get $val)
				(struct.get $Frame $binds (local.get $f)))))

	(func $frameFind (export "frameFind")
			(param $f (ref null $Frame))
			(param $key (ref $Str))
			(result (ref null $Val))

		(local $r (ref null $Val))

		(if (result (ref null $Val)) (ref.is_null (local.get $f))
		(then (ref.null $Val))
		(else (block
			(local.set $r
				(call $bindFind
					(struct.get $Frame $binds (local.get $f))
					(local.get $key))))

			(if (result (ref null $Val)) (ref.is_null (local.get $r))
			(then (call $frameFind (call $frameUp (local.get $f)) (local.get $key)))
			(else (local.get $r))))))

	(func $frameBindHandler (export "frameBindHandler")
			(param $f (ref $Frame))
			(param $t i32)
			(param $k (ref $Str))
			(param $h (ref $HandlerFn))
		(call $handlersBind
			(struct.get $Frame $handlers (local.get $f))
			(local.get $t)
			(local.get $k)
			(local.get $h)))

	(func $frameFindHandler (export "frameFindHandler")
			(param $f (ref $Frame))
			(param $t i32)
			(param $k (ref $Str))
			(result (ref null $HandlerFn))
		(call $handlersFind
			(struct.get $Frame $handlers (local.get $f))
			(local.get $t)
			(local.get $k)))

	(func $frameSend (export "frameSend")
			(param $f (ref $Frame))
			(param $s (ref $Val))
			(param $v (ref $Str))
			(param $o (ref $Val))
			(param $e (ref $Frame))
			(result (ref null $Val))
		(local $h (ref null $HandlerFn))
		(local.set $h
			(call $frameFindHandler
				(local.get $f)
				(call $valGetTag (local.get $s))
				(local.get $v)))

		(if (result (ref null $Val)) (ref.is_null (local.get $h))
			(then (ref.null $Val))
			(else (call $callHandler
				  		(local.get $h)
						(local.get $s)
						(local.get $v)
						(local.get $o)
						(local.get $e)))))


	(data (i32.const 0) "evalitmsgthat")
	(global $RAW_STR_EVAL (export "RAW_STR_EVAL") (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_IT (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_MSG (mut (ref null $Str)) (ref.null $Str))
	(global $RAW_STR_THAT (mut (ref null $Str)) (ref.null $Str))

	(func $init
	    (global.set $RAW_STR_EVAL
			(call $rawStrFromMem (i32.const 0) (i32.const 4)))
	    (global.set $RAW_STR_IT
			(call $rawStrFromMem (i32.const 4) (i32.const 6)))
	    (global.set $RAW_STR_MSG
			(call $rawStrFromMem (i32.const 6) (i32.const 9)))
	    (global.set $RAW_STR_THAT
			(call $rawStrFromMem (i32.const 9) (i32.const 13)))
	)

	(start $init)

	(func $frameEval (export "frameEval")
			(param $f (ref $Frame))
			(param $v (ref $Val))
			(result (ref null $Val))
		(local $e (ref $Val))
		(local.set $e (call $newFrameVal (local.get $f)))
		(call $frameSend
			(local.get $f)
			(local.get $v)
			(ref.as_non_null (global.get $RAW_STR_EVAL))
			(local.get $e)
			(local.get $f)))

	;; generic handlers

	(func $anyEval (param $f eqref) (param $v eqref) (result (ref $Val))
		(ref.as_non_null
			(call $frameEval
				(ref.cast (ref $Frame) (local.get $f))
				(ref.cast (ref $Val) (local.get $v)))))

	(func $hReturnSubject (export "hReturnSubject")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local.get $s))

	(func $returnNil (export "returnNil")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(global.get $NIL))

	;; nil handlers

	(func $nilEq (export "nilEq")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(if (result (ref $Val))
			(call $isNil (ref.cast (ref $Val) (local.get $o)))
			(then (global.get $TRUE))
			(else (global.get $NIL))))

	;; int handlers

	(func $anyGetI64 (param $v eqref) (result i64)
		(call $valGetI64 (ref.cast (ref $Val) (local.get $v))))

	(func $intAdd (export "intAdd")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt (i64.add
			(call $anyGetI64 (local.get $s))
			(call $anyGetI64 (local.get $o)))))

	(func $intSub (export "intSub")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt (i64.sub
			(call $anyGetI64 (local.get $s))
			(call $anyGetI64 (local.get $o)))))

	(func $intMul (export "intMul")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt (i64.mul
			(call $anyGetI64 (local.get $s))
			(call $anyGetI64 (local.get $o)))))

	(func $intEq (export "intEq")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(if (result (ref $Val))
			(i64.eq
				(call $anyGetI64 (local.get $s))
				(call $anyGetI64 (local.get $o)))
			(then (ref.cast (ref $Val) (local.get $s)))
			(else (global.get $NIL))))

	(func $intLt (export "intLt")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(if (result (ref $Val))
			(i64.lt_s
				(call $anyGetI64 (local.get $s))
				(call $anyGetI64 (local.get $o)))
			(then (ref.cast (ref $Val) (local.get $s)))
			(else (global.get $NIL))))

	;; float handlers

	(func $anyGetF64 (param $v eqref) (result f64)
		(call $valGetF64 (ref.cast (ref $Val) (local.get $v))))

	(func $floatAdd (export "floatAdd")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.add
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))))

	(func $floatSub (export "floatSub")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.sub
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))))

	(func $floatMul (export "floatMul")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.mul
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))))

	(func $floatDiv (export "floatDiv")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newFloat (f64.div
			(call $anyGetF64 (local.get $s))
			(call $anyGetF64 (local.get $o)))))

	(func $floatEq (export "floatEq")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(if (result (ref $Val))
			(f64.eq
				(call $anyGetF64 (local.get $s))
				(call $anyGetF64 (local.get $o)))
			(then (ref.cast (ref $Val) (local.get $s)))
			(else (global.get $NIL))))

	(func $floatLt (export "floatLt")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(if (result (ref $Val))
			(f64.lt
				(call $anyGetF64 (local.get $s))
				(call $anyGetF64 (local.get $o)))
			(then (ref.cast (ref $Val) (local.get $s)))
			(else (global.get $NIL))))

	;; str handlers

	(func $anyGetStr (param $v eqref) (result (ref $Str))
		(call $valGetStr (ref.cast (ref $Val) (local.get $v))))

	(func $strSize (export "strSize")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt
			(i64.extend_i32_s (call $strLen (ref.cast (ref $Val) (local.get $s))))))

	(func $strEq (export "strEq")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(if (result (ref $Val))
			(call $rawStrEquals
				(call $anyGetStr (local.get $s))
				(call $anyGetStr (local.get $o)))
			(then (global.get $TRUE))
			(else (global.get $NIL))))

	;; pair handlers

	(func $hPairA (export "hPairA")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $pairGetA (ref.cast (ref $Val) (local.get $s))))

	(func $hPairB (export "hPairB")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $pairGetB (ref.cast (ref $Val) (local.get $s))))

	(func $hPairEval (export "hPairEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local $pair (ref $Val))
		(local.set $pair (ref.cast (ref $Val) (local.get $s)))

		(call $newPair
			(call $anyEval (local.get $e)
				 (call $pairGetA (local.get $pair)))
			(call $anyEval (local.get $e)
				 (call $pairGetB (local.get $pair)))))

	;; later handlers

	(func $hLaterEval (export "hLaterEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $laterUnwrap (ref.cast (ref $Val) (local.get $s))))

	;; name handlers

	(func $hNameEval (export "hNameEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(ref.as_non_null
			(call $frameFind
				(ref.cast (ref $Frame) (local.get $e))
				(call $valGetNameRawStr
					(ref.cast (ref $Val) (local.get $s))))))

	(func $hNameStr (export "hNameStr")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $strFromRawStr
			(call $valGetNameRawStr (ref.cast (ref $Val) (local.get $s)))))

	;; msg handlers

	(func $hMsgVerb (export "hMsgVerb")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $valGetMsgVerb
			(ref.cast (ref $Val) (local.get $s))))

	(func $hMsgObj (export "hMsgObj")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $valGetMsgObj
			(ref.cast (ref $Val) (local.get $s))))

	(func $hMsgEval (export "hMsgEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newMsg
			(call $valGetMsgVerbRawStr (ref.cast (ref $Val) (local.get $s)))
			(call $anyEval
				(local.get $e)
				(call $valGetMsgObj
					(ref.cast (ref $Val) (local.get $s))))))

	;; send handlers

	(func $hSendSubj (export "hSendSubj")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $valGetSendSubj
			(ref.cast (ref $Val) (local.get $s))))

	(func $hSendMsg (export "hSendMsg")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $valGetSendMsg
			(ref.cast (ref $Val) (local.get $s))))

	(func $hSendEval (export "hSendEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(local $self (ref $Val))
		(local $frame (ref $Frame))
		(local $subj (ref $Val))
		(local $msg (ref $Val))
		(local $that (ref $Val))
		(local $frameForSend (ref $Frame))

		(local.set $self (ref.cast (ref $Val) (local.get $s)))

		(local.set $frame (ref.cast (ref $Frame) (local.get $e)))

		(local.set $subj
			(ref.as_non_null
				(call $frameEval
					(local.get $frame)
					(call $valGetSendSubj (local.get $self)))))

		(local.set $msg
			(ref.as_non_null
				(call $frameEval
					(local.get $frame)
					(call $valGetSendMsg (local.get $self)))))

		(local.set $that (call $valGetMsgObj (local.get $msg)))

		(local.set $frameForSend (call $frameDown (local.get $frame)))

		(call $frameBind
			(local.get $frameForSend)
			(ref.as_non_null (global.get $RAW_STR_IT))
			(local.get $subj))
		(call $frameBind
			(local.get $frameForSend)
			(ref.as_non_null (global.get $RAW_STR_MSG))
			(local.get $msg))
		(call $frameBind
			(local.get $frameForSend)
			(ref.as_non_null (global.get $RAW_STR_THAT))
			(local.get $that))

		(ref.as_non_null
			(call $frameSend
				(local.get $frameForSend)
				(local.get $subj)
				(call $valGetMsgVerbRawStr (local.get $msg))
				(local.get $that)
				(local.get $frameForSend)))
	)

	;; block handlers
	
	(func $hBlockEval (export "hBlockEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)

	    (local $i i32)
	    (local $end i32)
		(local $items (ref $Block))
		(local $result (ref $Val))
		(local $item (ref $Val))
		(local $frame (ref $Frame))

		(local.set $items
			(call $valGetBlockRaw (ref.cast (ref $Val) (local.get $s))))
	    (local.set $i (i32.const 0))
		(local.set $end (array.len (local.get $items)))
		(local.set $result (global.get $NIL))
		(local.set $frame (ref.cast (ref $Frame) (local.get $e)))

	    ;; while ($i < $end)
	    block $loop_exit
			loop $loop
				;; Break the loop if $i >= $end
				(i32.ge_s (local.get $i) (local.get $end))
				br_if $loop_exit

				(local.set $item
					(array.get $Block (local.get $items) (local.get $i)))
				(local.set $result
					(ref.as_non_null
						(call $frameEval (local.get $frame) (local.get $item))))

				;; $i++
				(local.set $i (i32.add (local.get $i) (i32.const 1)))

				br $loop
			end
		end

		(local.get $result)
	)

	;; array handlers
	
	(func $hArraySize (export "hArraySize")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $newInt
			(i64.extend_i32_s
				(array.len
					(call $valGetArrayRaw (ref.cast (ref $Val) (local.get $s)))))))

	(func $hArrayGetItem (export "hArrayGetItem")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)
		(call $arrayGetItem
			(ref.cast (ref $Val) (local.get $s))
			(i32.wrap_i64
				(call $anyGetI64 (local.get $o)))))

	(func $hArrayEval (export "hArrayEval")
			(param $s eqref) (param $v eqref) (param $o eqref) (param $e eqref)
			(result eqref)

	    (local $i i32)
	    (local $end i32)
		(local $items (ref $Block))
		(local $result (ref $Array))
		(local $item (ref $Val))
		(local $frame (ref $Frame))

		(local.set $items
			(call $valGetArrayRaw (ref.cast (ref $Val) (local.get $s))))
	    (local.set $i (i32.const 0))
		(local.set $end (array.len (local.get $items)))
		(local.set $result (array.new $Array (global.get $NIL) (local.get $end)))
		(local.set $frame (ref.cast (ref $Frame) (local.get $e)))

	    ;; while ($i < $end)
	    block $loop_exit
			loop $loop
				;; Break the loop if $i >= $end
				(i32.ge_s (local.get $i) (local.get $end))
				br_if $loop_exit

				(local.set $item
					(array.get $Block (local.get $items) (local.get $i)))
				(array.set $Array
					(local.get $result)
					(local.get $i)
					(ref.as_non_null
						(call $frameEval (local.get $frame) (local.get $item))))

				;; $i++
				(local.set $i (i32.add (local.get $i) (i32.const 1)))

				br $loop
			end
		end

		(struct.new $Val (global.get $TYPE_ARRAY) (local.get $result))
	)
)
